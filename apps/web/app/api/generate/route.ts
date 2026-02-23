import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  getSystemPrompt,
  createConfirmationMessage,
  estimateTokens,
  type PromptLevel,
  type GenerationPlan,
} from "@/lib/ai/system-prompt";
import { extractCodeFromResponse } from "@/lib/utils";

// ─── TYPES ───────────────────────────────────────────────────────

interface GenerateRequest {
  prompt: string;
  useOwnKey?: boolean;
  phase?: "plan" | "generate";
  plan?: GenerationPlan;
  promptLevel?: PromptLevel;
}

// ─── ANALYZE PROMPT FOR PLANNING ─────────────────────────────────

function analyzePrompt(prompt: string): GenerationPlan {
  const lowerPrompt = prompt.toLowerCase();

  // Detect component type
  const categories = [
    "button", "card", "input", "form", "table", "calendar",
    "dialog", "modal", "notification", "toast", "tab", "menu",
    "navigation", "hero", "pricing", "footer", "loader", "avatar"
  ];

  const detectedCategory = categories.find(c => lowerPrompt.includes(c)) || "custom";

  // Detect features
  const features: string[] = [];
  if (/animat|motion|spring|hover|press/i.test(prompt)) features.push("Spring animations");
  if (/click|toggle|select|interactive/i.test(prompt)) features.push("Audio feedback");
  if (/dark|theme|mode/i.test(prompt)) features.push("Dark mode");
  if (/responsive|mobile/i.test(prompt)) features.push("Responsive");
  if (/variant|size|color/i.test(prompt)) features.push("Variants (cva)");

  // Always include these
  features.push("TypeScript props");
  features.push("Tailwind CSS");

  // Detect complexity
  const isComplex = /dashboard|wizard|multi|step|complex|full/i.test(prompt);
  const isSimple = /simple|basic|minimal|small/i.test(prompt);

  const complexity = isComplex ? "complex" : isSimple ? "simple" : "medium";
  const estimatedTokens = { simple: 800, medium: 1500, complex: 2500 }[complexity];

  // Detect spring preset
  const springPreset = /bouncy|playful/i.test(prompt) ? "bouncy" :
                       /smooth|gentle/i.test(prompt) ? "smooth" :
                       /snappy|quick/i.test(prompt) ? "snappy" :
                       /heavy|large/i.test(prompt) ? "heavy" : "default";

  return {
    componentName: prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, "").trim(),
    category: detectedCategory,
    features,
    springPreset: springPreset as any,
    hasAudio: /click|toggle|select|button|interactive/i.test(prompt),
    estimatedTokens,
  };
}

// ─── SELECT OPTIMAL PROMPT LEVEL ─────────────────────────────────

function selectPromptLevel(plan: GenerationPlan): PromptLevel {
  if (plan.estimatedTokens > 2000) return "full";
  if (plan.estimatedTokens < 1000) return "minimal";
  return "standard";
}

// ─── MAIN HANDLER ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: GenerateRequest = await req.json();
    const { prompt, useOwnKey, phase = "plan", plan: providedPlan, promptLevel } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // ─── PHASE 1: PLANNING ──────────────────────────────────────
    if (phase === "plan") {
      const plan = analyzePrompt(prompt);
      const confirmationMessage = createConfirmationMessage(plan);
      const recommendedPromptLevel = selectPromptLevel(plan);

      return NextResponse.json({
        phase: "plan",
        plan,
        message: confirmationMessage,
        promptLevel: recommendedPromptLevel,
        estimatedCost: plan.estimatedTokens < 1500 ? "low" : plan.estimatedTokens < 2500 ? "medium" : "high",
      });
    }

    // ─── PHASE 2: GENERATION ────────────────────────────────────

    // Get credits
    const { data: credits, error: creditsError } = await supabase
      .from("credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      return NextResponse.json(
        { error: "Credits not found" },
        { status: 500 }
      );
    }

    // Determine API key
    let apiKey: string;
    let mode: "managed" | "byok";

    if (useOwnKey) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("api_key_encrypted")
        .eq("id", user.id)
        .single();

      if (!profile?.api_key_encrypted) {
        return NextResponse.json(
          { error: "No API key configured. Add your key in Settings." },
          { status: 400 }
        );
      }

      apiKey = profile.api_key_encrypted;
      mode = "byok";
    } else {
      const remaining =
        credits.total_credits + credits.bonus_credits - credits.used_credits;

      if (remaining <= 0) {
        return NextResponse.json(
          {
            error: "No credits remaining",
            upgradeUrl: "/dashboard/settings",
            remaining: 0,
          },
          { status: 402 }
        );
      }

      apiKey = process.env.ANTHROPIC_API_KEY!;
      mode = "managed";
    }

    // Select system prompt based on complexity
    const plan = providedPlan || analyzePrompt(prompt);
    const selectedPromptLevel = promptLevel || selectPromptLevel(plan);
    const systemPrompt = getSystemPrompt(selectedPromptLevel);

    // Call AI with optimized prompt
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: plan.estimatedTokens < 1500 ? 4096 : 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawResponse = response.content
      .filter((block) => block.type === "text")
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("\n");

    const generatedCode = extractCodeFromResponse(rawResponse);

    // Deduct credit (managed mode only)
    if (mode === "managed") {
      await supabase
        .from("credits")
        .update({
          used_credits: credits.used_credits + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Save generation
    const { data: generation } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        prompt,
        result: generatedCode,
        model: "claude-sonnet-4-20250514",
        credits_used: mode === "managed" ? 1 : 0,
        mode,
        metadata: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          promptLevel: selectedPromptLevel,
          plan,
        },
      })
      .select()
      .single();

    // Return result
    const remaining =
      mode === "managed"
        ? credits.total_credits +
          credits.bonus_credits -
          credits.used_credits -
          1
        : null;

    return NextResponse.json({
      phase: "complete",
      code: generatedCode,
      generationId: generation?.id,
      credits: {
        remaining,
        mode,
      },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        promptLevel: selectedPromptLevel,
      },
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
