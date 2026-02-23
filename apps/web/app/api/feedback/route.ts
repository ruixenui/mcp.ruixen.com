import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── TYPES ───────────────────────────────────────────────────────

interface FeedbackRequest {
  generationId: string;
  action: "accepted" | "edited" | "rejected" | "regenerated";
  originalCode?: string;
  editedCode?: string;
  rating?: number;
  feedbackText?: string;
  timeToActionMs?: number;
}

interface CodeEdit {
  type: "spring_change" | "style_change" | "structure_change" | "audio_change" | "other";
  description: string;
  before?: string;
  after?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────

function detectCategory(code: string): string {
  const lower = code.toLowerCase();
  const categories = [
    { name: "button", patterns: ["button", "btn", "onclick", "onpress"] },
    { name: "card", patterns: ["card", "cardcontent", "cardheader"] },
    { name: "input", patterns: ["input", "textfield", "textarea"] },
    { name: "dialog", patterns: ["dialog", "modal", "overlay"] },
    { name: "notification", patterns: ["toast", "notification", "alert"] },
    { name: "navigation", patterns: ["nav", "menu", "sidebar"] },
    { name: "tabs", patterns: ["tab", "tablist", "tabpanel"] },
    { name: "loader", patterns: ["loader", "spinner", "loading"] },
    { name: "avatar", patterns: ["avatar", "profile", "user"] },
  ];

  for (const cat of categories) {
    if (cat.patterns.some(p => lower.includes(p))) {
      return cat.name;
    }
  }
  return "custom";
}

function extractSpringConfig(code: string): object | null {
  // Match spring configs like { type: "spring", stiffness: 400, damping: 28 }
  const springMatch = code.match(/stiffness\s*[:=]\s*(\d+)[\s\S]*?damping\s*[:=]\s*(\d+)/);
  if (springMatch) {
    const massMatch = code.match(/mass\s*[:=]\s*([\d.]+)/);
    return {
      stiffness: parseInt(springMatch[1]),
      damping: parseInt(springMatch[2]),
      mass: massMatch ? parseFloat(massMatch[1]) : 1,
    };
  }
  return null;
}

function detectFeatures(code: string): string[] {
  const features: string[] = [];
  if (/motion\.|framer-motion|motion\/react/.test(code)) features.push("spring_animation");
  if (/AudioContext|useSound|playClick/.test(code)) features.push("audio_feedback");
  if (/dark:|\.dark\s|data-theme/.test(code)) features.push("dark_mode");
  if (/cva\(|variants/.test(code)) features.push("variants");
  if (/AnimatePresence/.test(code)) features.push("exit_animation");
  if (/useReducedMotion|prefers-reduced-motion/.test(code)) features.push("a11y_motion");
  return features;
}

function analyzeEdits(original: string, edited: string): CodeEdit[] {
  const edits: CodeEdit[] = [];

  // Check spring changes
  const origSpring = extractSpringConfig(original);
  const editSpring = extractSpringConfig(edited);
  if (JSON.stringify(origSpring) !== JSON.stringify(editSpring)) {
    edits.push({
      type: "spring_change",
      description: "Modified spring configuration",
      before: JSON.stringify(origSpring),
      after: JSON.stringify(editSpring),
    });
  }

  // Check audio changes
  const origHasAudio = /AudioContext|useSound/.test(original);
  const editHasAudio = /AudioContext|useSound/.test(edited);
  if (origHasAudio !== editHasAudio) {
    edits.push({
      type: "audio_change",
      description: editHasAudio ? "Added audio feedback" : "Removed audio feedback",
    });
  }

  // Check for major structural changes (rough heuristic)
  const origLines = original.split("\n").length;
  const editLines = edited.split("\n").length;
  if (Math.abs(origLines - editLines) > 10) {
    edits.push({
      type: "structure_change",
      description: `Significant structure change (${origLines} → ${editLines} lines)`,
    });
  }

  return edits;
}

// ─── POST: Submit Feedback ───────────────────────────────────────

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

    const body: FeedbackRequest = await req.json();
    const {
      generationId,
      action,
      originalCode,
      editedCode,
      rating,
      feedbackText,
      timeToActionMs,
    } = body;

    if (!generationId || !action) {
      return NextResponse.json(
        { error: "generationId and action are required" },
        { status: 400 }
      );
    }

    // Verify generation belongs to user
    const { data: generation } = await supabase
      .from("generations")
      .select("id, result")
      .eq("id", generationId)
      .eq("user_id", user.id)
      .single();

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Analyze the code
    const codeToAnalyze = editedCode || originalCode || generation.result;
    const detectedCategory = detectCategory(codeToAnalyze);
    const detectedFeatures = detectFeatures(codeToAnalyze);
    const springConfig = extractSpringConfig(codeToAnalyze);
    const hasAudio = /AudioContext|useSound/.test(codeToAnalyze);

    // Analyze edits if user modified the code
    let edits: CodeEdit[] = [];
    if (action === "edited" && originalCode && editedCode) {
      edits = analyzeEdits(originalCode, editedCode);
    }

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from("generation_feedback")
      .insert({
        generation_id: generationId,
        user_id: user.id,
        action,
        original_code: originalCode,
        edited_code: editedCode,
        edits,
        rating,
        feedback_text: feedbackText,
        detected_category: detectedCategory,
        detected_features: detectedFeatures,
        spring_config: springConfig,
        has_audio: hasAudio,
        time_to_action_ms: timeToActionMs,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      analysis: {
        category: detectedCategory,
        features: detectedFeatures,
        springConfig,
        editsDetected: edits.length,
      },
    });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET: Get User's Feedback History ────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const { data: feedback } = await supabase
      .from("generation_feedback")
      .select("id, action, detected_category, rating, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ feedback });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
