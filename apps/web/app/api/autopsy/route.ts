import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

import { ComponentDNA } from "@/lib/dna/schema";
import { enrichDNA } from "@/lib/dna/enrichment";
import { parseIntentLocally, parseAIResponse, INTENT_PARSER_PROMPT } from "@/lib/dna/parser";
import {
  validateCode,
  getValidationSummary,
  formatAutopsyReport,
  getGenerationHints,
  ValidationResult,
} from "@/lib/dna/validation";
import { getSystemPrompt } from "@/lib/ai/system-prompt";

// ─── TYPES ───────────────────────────────────────────────────────

interface AutopsyRequest {
  code: string;           // Component code to analyze
  componentType?: string; // Optional: what type of component
  fix?: boolean;          // If true, generate fixed version
}

interface AutopsyResponse {
  // Analysis
  analysis: {
    detectedType: string;
    dna: ComponentDNA;
    validation: ValidationResult;
    report: string;
  };

  // Fixed version (if requested)
  fixed?: {
    code: string;
    tokensUsed: number;
  };
}

// ─── COMPONENT TYPE DETECTION ────────────────────────────────────

function detectComponentType(code: string): string {
  const lower = code.toLowerCase();

  // Check for common patterns
  if (/modal|dialog/i.test(code) && /open|isopen|onclose/i.test(code)) return "modal";
  if (/drawer|panel|sheet/i.test(code) && /open|isopen/i.test(code)) return "drawer";
  if (/dropdown|select/i.test(code) && /options|items/i.test(code)) return "dropdown";
  if (/popover/i.test(code)) return "popover";
  if (/tooltip/i.test(code)) return "tooltip";
  if (/menu/i.test(code) && /items|options/i.test(code)) return "menu";
  if (/tabs?/i.test(code) && /active|selected/i.test(code)) return "tabs";
  if (/accordion|collapsible/i.test(code)) return "accordion";
  if (/toast|notification/i.test(code)) return "toast";
  if (/button/i.test(code) && /onclick|click/i.test(code)) return "button";
  if (/input|textfield/i.test(code) && /value|onchange/i.test(code)) return "input";
  if (/checkbox/i.test(code) && /checked/i.test(code)) return "checkbox";
  if (/switch|toggle/i.test(code)) return "switch";
  if (/card/i.test(code)) return "card";
  if (/avatar/i.test(code)) return "avatar";
  if (/badge/i.test(code)) return "badge";

  return "custom";
}

// ─── INFER DNA FROM CODE ─────────────────────────────────────────

function inferDNAFromCode(code: string, type: string): ComponentDNA {
  const dna: ComponentDNA = {
    type: type as any,
    interaction: [],
    a11y: [],
    layout: [],
    animation: [],
    variants: [],
  };

  // Infer interactions
  if (/onclick|click/i.test(code)) dna.interaction.push("click");
  if (/onkeydown|keydown/i.test(code)) dna.interaction.push("keyboard");
  if (/onmouseenter|hover/i.test(code)) dna.interaction.push("hover");
  if (/escape/i.test(code)) dna.interaction.push("escape-dismiss");
  if (/clickoutside|outsideclick/i.test(code)) dna.interaction.push("outside-dismiss");

  // Infer a11y
  if (/aria-expanded/i.test(code)) dna.a11y.push("aria-expanded");
  if (/aria-selected/i.test(code)) dna.a11y.push("aria-selected");
  if (/aria-checked/i.test(code)) dna.a11y.push("aria-checked");
  if (/aria-live/i.test(code)) dna.a11y.push("aria-live");
  if (/focustrap/i.test(code)) dna.a11y.push("focus-trap");
  if (/reduced-motion|reducedmotion/i.test(code)) dna.a11y.push("reduced-motion");
  if (/tabindex/i.test(code)) dna.a11y.push("keyboard-nav");

  // Infer layout
  if (/createportal|portal/i.test(code)) dna.layout.push("portal");
  if (/position.*fixed/i.test(code)) dna.layout.push("fixed");
  if (/overlay/i.test(code)) dna.layout.push("overlay");

  // Infer animation
  if (/motion|framer|animate/i.test(code)) {
    if (/spring/i.test(code)) dna.animation.push("spring");
    else dna.animation.push("spring"); // Default to spring
  }

  return dna;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AutopsyRequest = await req.json();
    const { code, componentType, fix = false } = body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: DETECT/INFER COMPONENT TYPE
    // ═══════════════════════════════════════════════════════════════

    const detectedType = componentType || detectComponentType(code);

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: INFER DNA FROM EXISTING CODE
    // ═══════════════════════════════════════════════════════════════

    const inferredDNA = inferDNAFromCode(code, detectedType);

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: ENRICH DNA (what SHOULD be there)
    // ═══════════════════════════════════════════════════════════════

    const enrichmentResult = enrichDNA(inferredDNA);
    const enrichedDNA = enrichmentResult.enriched;

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: VALIDATE CODE AGAINST ENRICHED DNA
    // ═══════════════════════════════════════════════════════════════

    const validation = validateCode(code, enrichedDNA);
    const report = formatAutopsyReport(validation, detectedType);

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: FIX CODE (if requested)
    // ═══════════════════════════════════════════════════════════════

    let fixed: { code: string; tokensUsed: number } | undefined;

    if (fix && validation.issues.length > 0) {
      const apiKey = process.env.ANTHROPIC_API_KEY!;
      const anthropic = new Anthropic({ apiKey });

      // Build fix prompt
      const hints = getGenerationHints(enrichedDNA);
      const issueList = validation.issues
        .map((i) => `- ${i.message} → Fix: ${i.fix}`)
        .join("\n");

      const fixPrompt = `Fix this ${detectedType} component to be production-grade.

CURRENT CODE:
\`\`\`tsx
${code}
\`\`\`

ISSUES TO FIX:
${issueList}

REQUIREMENTS:
${hints.map((h) => `• ${h}`).join("\n")}

Return ONLY the fixed TypeScript React component code, no explanations.`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: getSystemPrompt("standard"),
        messages: [{ role: "user", content: fixPrompt }],
      });

      const fixedCode = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .replace(/^```(?:typescript|tsx|jsx|ts)?\n?/gm, "")
        .replace(/\n?```$/gm, "")
        .trim();

      fixed = {
        code: fixedCode,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════════

    const response: AutopsyResponse = {
      analysis: {
        detectedType,
        dna: enrichedDNA,
        validation,
        report,
      },
      fixed,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Autopsy API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
