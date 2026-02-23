import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── TYPES ───────────────────────────────────────────────────────

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  confidence?: number;
}

interface CategoryData {
  category: string;
  successRate: number;
  sampleSize: number;
  optimalSpring: SpringConfig;
  commonEdits: string[];
  learnedPatterns: Record<string, string>;
}

// ─── DEFAULT PATTERNS (Fallback) ─────────────────────────────────

const DEFAULT_SPRING: SpringConfig = { stiffness: 400, damping: 28, mass: 1 };

const DEFAULT_PATTERNS: Record<string, Record<string, string>> = {
  buttons: {
    springOnPress: "scale(0.97) with snappy spring",
    springOnHover: "subtle scale(1.02)",
    audio: "3ms noise on click",
  },
  cards: {
    springOnHover: "translateY(-2px) with smooth spring",
    shadow: "elevation on hover",
  },
  dialogs: {
    enter: "scale from 0.95 + fade",
    exit: "scale to 0.95 + fade with AnimatePresence",
  },
  notifications: {
    enter: "slideIn from right with bouncy spring",
    exit: "slideOut with AnimatePresence",
  },
};

// ─── SUPABASE CLIENT (Service Role for API) ──────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

// ─── GET: Fetch Optimized Patterns ───────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const detail = searchParams.get("detail") || "standard";

  const supabase = getServiceClient();

  // If no database, return defaults
  if (!supabase) {
    return NextResponse.json({
      source: "default",
      patterns: category ? { [category]: DEFAULT_PATTERNS[category] || {} } : DEFAULT_PATTERNS,
      spring: DEFAULT_SPRING,
    });
  }

  try {
    // Fetch pattern analytics
    const { data: analytics } = await supabase
      .from("pattern_analytics")
      .select("category, pattern_key, success_rate, sample_size, optimal_spring, common_edits")
      .gte("sample_size", 5); // Only return patterns with enough data

    // Fetch optimal springs per category
    const { data: springs } = await supabase
      .from("spring_analytics")
      .select("category, stiffness, damping, mass, uses, accepts")
      .gte("uses", 5)
      .order("accepts", { ascending: false });

    // Fetch learned patterns
    const { data: learned } = await supabase
      .from("learned_patterns")
      .select("category, pattern, success_rate")
      .eq("is_active", true);

    // Build optimized response
    const categoryData: Record<string, CategoryData> = {};

    // Process analytics
    if (analytics) {
      for (const row of analytics) {
        if (!categoryData[row.category]) {
          categoryData[row.category] = {
            category: row.category,
            successRate: row.success_rate || 0,
            sampleSize: row.sample_size || 0,
            optimalSpring: DEFAULT_SPRING,
            commonEdits: [],
            learnedPatterns: DEFAULT_PATTERNS[row.category] || {},
          };
        }
        if (row.optimal_spring) {
          categoryData[row.category].optimalSpring = row.optimal_spring;
        }
        if (row.common_edits) {
          categoryData[row.category].commonEdits = row.common_edits;
        }
      }
    }

    // Process spring analytics
    if (springs) {
      const bestSpringByCategory: Record<string, SpringConfig> = {};
      for (const row of springs) {
        if (!bestSpringByCategory[row.category]) {
          bestSpringByCategory[row.category] = {
            stiffness: row.stiffness,
            damping: row.damping,
            mass: row.mass,
            confidence: row.uses > 0 ? row.accepts / row.uses : 0,
          };
        }
      }

      for (const [cat, spring] of Object.entries(bestSpringByCategory)) {
        if (categoryData[cat]) {
          categoryData[cat].optimalSpring = spring;
        }
      }
    }

    // Process learned patterns
    if (learned) {
      for (const row of learned) {
        if (categoryData[row.category]) {
          categoryData[row.category].learnedPatterns = row.pattern;
        }
      }
    }

    // Filter by category if specified
    const result = category
      ? { [category]: categoryData[category] || { category, ...DEFAULT_PATTERNS[category] } }
      : categoryData;

    // Minimal response for token efficiency
    if (detail === "minimal") {
      const minimal: Record<string, { spring: SpringConfig }> = {};
      for (const [cat, data] of Object.entries(result)) {
        minimal[cat] = { spring: (data as CategoryData).optimalSpring || DEFAULT_SPRING };
      }
      return NextResponse.json({
        source: "learned",
        patterns: minimal,
        updated: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      source: Object.keys(categoryData).length > 0 ? "learned" : "default",
      patterns: Object.keys(result).length > 0 ? result : DEFAULT_PATTERNS,
      defaultSpring: DEFAULT_SPRING,
      updated: new Date().toISOString(),
      stats: {
        categoriesWithData: Object.keys(categoryData).length,
        totalSamples: analytics?.reduce((sum, a) => sum + (a.sample_size || 0), 0) || 0,
      },
    });
  } catch (error) {
    console.error("Patterns API error:", error);
    return NextResponse.json({
      source: "default",
      patterns: DEFAULT_PATTERNS,
      spring: DEFAULT_SPRING,
      error: "Failed to fetch learned patterns",
    });
  }
}

// ─── POST: Trigger Learning Update ───────────────────────────────

export async function POST(req: NextRequest) {
  // Verify admin/service key
  const authHeader = req.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Aggregate feedback data and update learned patterns
    const { data: feedback } = await supabase
      .from("generation_feedback")
      .select("detected_category, action, spring_config, edits")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (!feedback || feedback.length === 0) {
      return NextResponse.json({ message: "No recent feedback to process" });
    }

    // Group by category
    const categoryStats: Record<string, {
      total: number;
      accepted: number;
      springs: { stiffness: number; damping: number; count: number }[];
    }> = {};

    for (const fb of feedback) {
      const cat = fb.detected_category || "custom";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, accepted: 0, springs: [] };
      }
      categoryStats[cat].total++;
      if (fb.action === "accepted") {
        categoryStats[cat].accepted++;
        if (fb.spring_config) {
          categoryStats[cat].springs.push({
            stiffness: fb.spring_config.stiffness,
            damping: fb.spring_config.damping,
            count: 1,
          });
        }
      }
    }

    // Update learned patterns for each category
    for (const [category, stats] of Object.entries(categoryStats)) {
      if (stats.total < 5) continue; // Need minimum samples

      // Calculate optimal spring (average of accepted)
      let optimalSpring = DEFAULT_SPRING;
      if (stats.springs.length > 0) {
        const avgStiffness = Math.round(
          stats.springs.reduce((sum, s) => sum + s.stiffness, 0) / stats.springs.length
        );
        const avgDamping = Math.round(
          stats.springs.reduce((sum, s) => sum + s.damping, 0) / stats.springs.length
        );
        optimalSpring = { stiffness: avgStiffness, damping: avgDamping, mass: 1 };
      }

      // Upsert learned pattern
      await supabase
        .from("learned_patterns")
        .upsert({
          category,
          version: 1,
          pattern: DEFAULT_PATTERNS[category] || {},
          spring_presets: { default: optimalSpring },
          success_rate: stats.accepted / stats.total,
          total_uses: stats.total,
          is_active: true,
        }, {
          onConflict: "category,version",
        });
    }

    return NextResponse.json({
      success: true,
      processed: feedback.length,
      categories: Object.keys(categoryStats),
    });
  } catch (error) {
    console.error("Learning update error:", error);
    return NextResponse.json({ error: "Learning update failed" }, { status: 500 });
  }
}
