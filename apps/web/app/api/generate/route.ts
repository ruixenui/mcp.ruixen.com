import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { RUIXEN_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { extractCodeFromResponse } from "@/lib/utils";

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

    const { prompt, useOwnKey } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // ─── GET USER CREDITS ──────────────────────────────────────
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

    // ─── DETERMINE API KEY ─────────────────────────────────────
    let apiKey: string;
    let mode: "managed" | "byok";

    if (useOwnKey) {
      // BYOK mode — use user's own API key
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

      // In production, decrypt the API key here
      apiKey = profile.api_key_encrypted;
      mode = "byok";
    } else {
      // Managed mode — check credits
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

    // ─── CALL AI ───────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: RUIXEN_SYSTEM_PROMPT,
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

    // Extract clean code from response
    const generatedCode = extractCodeFromResponse(rawResponse);

    // ─── DEDUCT CREDIT (managed mode only) ─────────────────────
    if (mode === "managed") {
      await supabase
        .from("credits")
        .update({
          used_credits: credits.used_credits + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // ─── SAVE GENERATION ───────────────────────────────────────
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
        },
      })
      .select()
      .single();

    // ─── RETURN RESULT ─────────────────────────────────────────
    const remaining =
      mode === "managed"
        ? credits.total_credits +
          credits.bonus_credits -
          credits.used_credits -
          1
        : null;

    return NextResponse.json({
      code: generatedCode,
      generationId: generation?.id,
      credits: {
        remaining,
        mode,
      },
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
