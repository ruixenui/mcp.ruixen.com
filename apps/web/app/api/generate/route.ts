import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getSystemPrompt,
  type PromptLevel,
  type GenerationPlan,
} from "@/lib/ai/system-prompt";
import { createClient } from "@/lib/supabase/server";
import { extractCodeFromResponse } from "@/lib/utils";

// ─── TYPES ──────────────────────────────────────────────────────

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface GenerateRequest {
  prompt: string;
  conversationHistory?: ConversationMessage[];
}

// ─── ANALYZE PROMPT ─────────────────────────────────────────────

function analyzePrompt(prompt: string): GenerationPlan {
  const lowerPrompt = prompt.toLowerCase();

  const categories = [
    "button", "card", "input", "form", "table", "calendar",
    "dialog", "modal", "notification", "toast", "tab", "menu",
    "navigation", "hero", "pricing", "footer", "loader", "avatar",
    "chart", "graph", "dashboard", "sidebar", "tooltip", "dropdown",
    "select", "slider", "switch", "progress", "badge", "list",
  ];

  const detectedCategory = categories.find(c => lowerPrompt.includes(c)) || "custom";

  const features: string[] = [];
  if (/animat|motion|spring|hover|press/i.test(prompt)) features.push("Spring animations");
  if (/click|toggle|select|interactive/i.test(prompt)) features.push("Audio feedback");
  if (/dark|theme|mode/i.test(prompt)) features.push("Dark mode");
  if (/responsive|mobile/i.test(prompt)) features.push("Responsive");
  if (/variant|size|color/i.test(prompt)) features.push("Variants (cva)");
  if (/chart|graph|plot|bar\s*chart|line\s*chart|pie|area|data\s*viz/i.test(prompt)) features.push("Data visualization (SVG)");
  if (/grid|layout|column|row/i.test(prompt)) features.push("Grid layout");
  if (/tooltip|hover\s+detail/i.test(prompt)) features.push("Hover tooltips");
  if (/sort|filter|search/i.test(prompt)) features.push("Filtering/sorting");
  features.push("TypeScript props");
  features.push("Tailwind CSS");

  const isComplex = /dashboard|wizard|multi|step|complex|full|chart|graph|analytics|page|layout|kanban|timeline|stock|data\s*(?:viz|table|grid)/i.test(prompt);
  const isSimple = /simple|basic|minimal|small|tiny/i.test(prompt);
  const complexity = isComplex ? "complex" : isSimple ? "simple" : "medium";
  const estimatedTokens = { simple: 1200, medium: 2200, complex: 3500 }[complexity];

  const springPreset = /bouncy|playful/i.test(prompt) ? "bouncy" :
                       /smooth|gentle/i.test(prompt) ? "smooth" :
                       /snappy|quick/i.test(prompt) ? "snappy" :
                       /heavy|large/i.test(prompt) ? "heavy" : "default";

  return {
    componentName: prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, "").trim(),
    category: detectedCategory,
    features,
    springPreset: springPreset as GenerationPlan["springPreset"],
    hasAudio: /click|toggle|select|button|interactive/i.test(prompt),
    estimatedTokens,
  };
}

function selectPromptLevel(plan: GenerationPlan): PromptLevel {
  const dataVizCategories = ["chart", "graph", "dashboard"];
  if (dataVizCategories.includes(plan.category) || plan.estimatedTokens > 3000) return "full";
  if (plan.estimatedTokens < 1200) return "minimal";
  return "standard";
}

// ─── LEARNED PATTERNS ───────────────────────────────────────────

async function fetchLearnedPatterns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  category: string
): Promise<string> {
  if (category === "custom") return "";

  try {
    const { data: patterns } = await supabase
      .from("learned_patterns")
      .select("pattern, spring_presets, success_rate")
      .eq("category", category)
      .eq("is_active", true)
      .order("success_rate", { ascending: false })
      .limit(1);

    if (!patterns || patterns.length === 0) return "";

    const p = patterns[0];
    const patternObj = (p.pattern || {}) as Record<string, string>;
    const entries = Object.entries(patternObj)
      .map(function (e) { return e[0] + ":" + e[1]; })
      .join(", ");

    const springPreset = (p.spring_presets as Record<string, { stiffness: number; damping: number }> | null)?.default;
    const springStr = springPreset
      ? " spring{s:" + springPreset.stiffness + ",d:" + springPreset.damping + "}"
      : "";

    const rate = Math.round((p.success_rate || 0) * 100);

    if (!entries && !springStr) return "";
    return "\nLEARNED(" + category + "): " + entries + springStr + " (" + rate + "% success)";
  } catch {
    return "";
  }
}

// ─── STREAMING HANDLER ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { prompt, conversationHistory } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    // ─── Resolve user (graceful — generation works without auth)
    let userId: string | null = null;
    let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

    try {
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Supabase unavailable — continue without learning features
    }

    // ─── Analyze prompt and select system prompt
    const plan = analyzePrompt(prompt);
    const promptLevel = selectPromptLevel(plan);

    // ─── Fetch learned patterns for this category
    let learnedAddendum = "";
    if (supabase) {
      learnedAddendum = await fetchLearnedPatterns(supabase, plan.category);
    }

    const systemPrompt = getSystemPrompt(promptLevel) + learnedAddendum;

    // ─── Build multi-turn messages array
    const messages: ConversationMessage[] = [];

    if (conversationHistory && conversationHistory.length > 0) {
      // Last 3 turns (6 messages max: user + assistant pairs)
      const recent = conversationHistory.slice(-6);
      for (const msg of recent) {
        if (msg.role === "assistant") {
          // Send only the code, not full markdown — token efficiency
          const codeOnly = extractCodeFromResponse(msg.content);
          messages.push({
            role: "assistant",
            content: codeOnly || msg.content.slice(0, 500),
          });
        } else {
          messages.push({ role: "user", content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: prompt });

    // ─── Stream response
    const anthropic = new Anthropic({ apiKey });
    const messageStream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      start(controller) {
        let closed = false;

        messageStream.on("text", (text) => {
          if (!closed) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "delta", text }) + "\n")
            );
          }
        });

        messageStream.finalMessage().then((msg) => {
          if (!closed) {
            // Extract full response text for storage
            const fullText = msg.content
              .filter((block) => block.type === "text")
              .map((block) => block.type === "text" ? block.text : "")
              .join("");

            const finalCode = extractCodeFromResponse(fullText);
            const generationId = crypto.randomUUID();

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "done",
                  generationId,
                  usage: {
                    inputTokens: msg.usage.input_tokens,
                    outputTokens: msg.usage.output_tokens,
                    promptLevel,
                  },
                }) + "\n"
              )
            );
            closed = true;
            controller.close();

            // ─── Non-blocking: persist generation to database
            if (userId && supabase && finalCode) {
              Promise.resolve(
                supabase
                  .from("generations")
                  .insert({
                    id: generationId,
                    user_id: userId,
                    prompt,
                    result: finalCode,
                    model: "claude-sonnet-4-20250514",
                    credits_used: 1,
                    mode: "managed",
                    metadata: {
                      category: plan.category,
                      features: plan.features,
                      springPreset: plan.springPreset,
                      promptLevel,
                      inputTokens: msg.usage.input_tokens,
                      outputTokens: msg.usage.output_tokens,
                      hasLearnedPatterns: learnedAddendum.length > 0,
                    },
                  })
              ).catch((err: unknown) =>
                console.error("Failed to save generation:", err)
              );
            }
          }
        }).catch((err) => {
          if (!closed) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  error: err instanceof Error ? err.message : "Stream failed",
                }) + "\n"
              )
            );
            closed = true;
            controller.close();
          }
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
