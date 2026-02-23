import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

import { ComponentDNA, createDNAFingerprint, validateDNA } from "@/lib/dna/schema";
import { enrichDNA, getSpringFromDNA } from "@/lib/dna/enrichment";
import { parseIntentLocally, parseAIResponse, INTENT_PARSER_PROMPT } from "@/lib/dna/parser";
import { lookupByDNA, addToRegistry } from "@/lib/dna/registry";
import { getSystemPrompt } from "@/lib/ai/system-prompt";

// ─── TYPES ───────────────────────────────────────────────────────

interface DNARequest {
  input: string;          // Natural language input
  skipCache?: boolean;    // Force regeneration
  useOwnKey?: boolean;    // BYOK mode
}

interface DNAResponse {
  // Token accounting
  tokens: {
    parse: number;        // Tokens for intent parsing (~200)
    enrich: 0;            // Always zero (pure code)
    lookup: 0;            // Always zero (hash lookup)
    generate: number;     // Only on cache miss
    total: number;
  };

  // Pipeline stages
  pipeline: {
    parsed: ComponentDNA;
    enriched: ComponentDNA;
    fingerprint: string;
    cacheHit: boolean;
    enrichmentRules: string[];
  };

  // Result
  code: string;
  spring: {
    stiffness: number;
    damping: number;
    mass: number;
  };

  // Registry info
  registry: {
    usageCount: number;
    successRate: number;
  } | null;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();
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

    const body: DNARequest = await req.json();
    const { input, skipCache = false, useOwnKey = false } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE 1: INTENT PARSING (Only AI step if local fails)
    // ═══════════════════════════════════════════════════════════════

    let parsedDNA: ComponentDNA | null = null;
    let parseTokens = 0;

    // Try local parsing first (ZERO tokens)
    parsedDNA = parseIntentLocally(input);

    if (!parsedDNA) {
      // Fall back to AI parsing (~200 tokens)
      const apiKey = useOwnKey
        ? await getUserApiKey(user.id, supabase)
        : process.env.ANTHROPIC_API_KEY!;

      if (!apiKey) {
        return NextResponse.json(
          { error: "No API key available" },
          { status: 400 }
        );
      }

      const anthropic = new Anthropic({ apiKey });

      const parseResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256, // Small response
        system: INTENT_PARSER_PROMPT,
        messages: [{ role: "user", content: input }],
      });

      parseTokens = parseResponse.usage.input_tokens + parseResponse.usage.output_tokens;

      const responseText = parseResponse.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      parsedDNA = parseAIResponse(responseText);

      if (!parsedDNA) {
        return NextResponse.json(
          { error: "Failed to parse intent", raw: responseText },
          { status: 400 }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE 2: DNA ENRICHMENT (ZERO tokens - pure code)
    // ═══════════════════════════════════════════════════════════════

    const enrichmentResult = enrichDNA(parsedDNA);
    const enrichedDNA = enrichmentResult.enriched;

    // Validate enriched DNA
    const validation = validateDNA(enrichedDNA);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid DNA", errors: validation.errors },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: REGISTRY LOOKUP (ZERO tokens - hash lookup)
    // ═══════════════════════════════════════════════════════════════

    const fingerprint = createDNAFingerprint(enrichedDNA);
    let code: string | null = null;
    let cacheHit = false;
    let registryInfo: { usageCount: number; successRate: number } | null = null;
    let generateTokens = 0;

    if (!skipCache) {
      const lookupResult = await lookupByDNA(enrichedDNA, supabase);

      if (lookupResult.hit && lookupResult.entry) {
        // CACHE HIT - Zero generation tokens!
        code = lookupResult.entry.code;
        cacheHit = true;
        registryInfo = {
          usageCount: lookupResult.entry.metadata.usageCount,
          successRate: lookupResult.entry.metadata.successRate,
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE 4: GENERATION FALLBACK (Only on cache miss)
    // ═══════════════════════════════════════════════════════════════

    if (!code) {
      // Check credits for managed mode
      if (!useOwnKey) {
        const { data: credits } = await supabase
          .from("credits")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!credits) {
          return NextResponse.json(
            { error: "Credits not found" },
            { status: 500 }
          );
        }

        const remaining =
          credits.total_credits + credits.bonus_credits - credits.used_credits;

        if (remaining <= 0) {
          return NextResponse.json(
            { error: "No credits remaining", upgradeUrl: "/dashboard/settings" },
            { status: 402 }
          );
        }
      }

      // Generate component using enriched DNA as specification
      const apiKey = useOwnKey
        ? await getUserApiKey(user.id, supabase)
        : process.env.ANTHROPIC_API_KEY!;

      const anthropic = new Anthropic({ apiKey });

      // Use DNA to create precise generation prompt
      const spring = getSpringFromDNA(enrichedDNA);
      const dnaPrompt = createDNAPrompt(enrichedDNA, spring);

      const generateResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: getSystemPrompt("standard"),
        messages: [{ role: "user", content: dnaPrompt }],
      });

      generateTokens =
        generateResponse.usage.input_tokens + generateResponse.usage.output_tokens;

      code = generateResponse.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      // Clean code (remove markdown fences if present)
      code = cleanGeneratedCode(code);

      // Add to registry for future lookups
      const registryEntry = await addToRegistry(enrichedDNA, code, supabase);
      if (registryEntry) {
        registryInfo = {
          usageCount: 1,
          successRate: 1.0,
        };
      }

      // Deduct credit for generation (managed mode)
      if (!useOwnKey) {
        // credits was already fetched above
        const { data: currentCredits } = await supabase
          .from("credits")
          .select("used_credits")
          .eq("user_id", user.id)
          .single();

        if (currentCredits) {
          await supabase
            .from("credits")
            .update({
              used_credits: currentCredits.used_credits + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════════

    const spring = getSpringFromDNA(enrichedDNA);
    const totalTokens = parseTokens + generateTokens;

    const response: DNAResponse = {
      tokens: {
        parse: parseTokens,
        enrich: 0,
        lookup: 0,
        generate: generateTokens,
        total: totalTokens,
      },
      pipeline: {
        parsed: parsedDNA,
        enriched: enrichedDNA,
        fingerprint,
        cacheHit,
        enrichmentRules: enrichmentResult.appliedRules,
      },
      code,
      spring,
      registry: registryInfo,
    };

    // Log analytics (don't fail on error)
    try {
      await supabase.from("dna_analytics").insert({
        user_id: user.id,
        input,
        fingerprint,
        cache_hit: cacheHit,
        parse_tokens: parseTokens,
        generate_tokens: generateTokens,
        total_tokens: totalTokens,
        latency_ms: Date.now() - startTime,
      });
    } catch {
      // Ignore analytics errors
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("DNA API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────

async function getUserApiKey(userId: string, supabase: any): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("api_key_encrypted")
    .eq("id", userId)
    .single();

  return profile?.api_key_encrypted || null;
}

function createDNAPrompt(dna: ComponentDNA, spring: any): string {
  const features = [
    ...dna.interaction.map((i) => `- Interaction: ${i}`),
    ...dna.a11y.map((a) => `- Accessibility: ${a}`),
    ...dna.layout.map((l) => `- Layout: ${l}`),
    ...dna.animation.map((a) => `- Animation: ${a}`),
    ...dna.variants.map((v) => `- Variant: ${v}`),
  ].join("\n");

  return `Create a ${dna.type} component with these EXACT specifications:

${features}

Spring config: { stiffness: ${spring.stiffness}, damping: ${spring.damping}, mass: ${spring.mass} }

Generate the complete TypeScript React component.`;
}

function cleanGeneratedCode(code: string): string {
  // Remove markdown code fences
  return code
    .replace(/^```(?:typescript|tsx|jsx|ts)?\n?/gm, "")
    .replace(/\n?```$/gm, "")
    .trim();
}

// ─── GET: Registry Stats ─────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();

  try {
    const { data: stats } = await supabase.rpc("get_registry_stats");

    return NextResponse.json({
      registry: stats?.[0] || {
        total_components: 0,
        total_lookups: 0,
        avg_success_rate: 0,
        top_types: [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
