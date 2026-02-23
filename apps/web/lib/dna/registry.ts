/**
 * DNA REGISTRY
 *
 * Hash-based component lookup - ZERO AI tokens.
 * Same DNA fingerprint always returns same component.
 *
 * Registry Architecture:
 * - SOURCE OF TRUTH: ruixen.com component library
 * - LOCAL CACHE: mcp.ruixen.com (for performance)
 *
 * Flow:
 * 1. DNA → Fingerprint hash
 * 2. Check local cache (fast)
 * 3. Miss → Call ruixen.com registry API
 * 4. Cache result locally
 * 5. Generation fallback only if ruixen.com has no match
 */

import {
  ComponentDNA,
  createDNAFingerprint,
  calculateDNASimilarity,
} from "./schema";

// ─── RUIXEN.COM REGISTRY API ─────────────────────────────────────

const RUIXEN_REGISTRY_URL = process.env.RUIXEN_REGISTRY_URL || "https://ruixen.com/api/registry";

// ─── REGISTRY TYPES ──────────────────────────────────────────────

export interface RegistryEntry {
  id: string;
  fingerprint: string;
  dna: ComponentDNA;
  code: string;
  metadata: {
    createdAt: string;
    usageCount: number;
    successRate: number;
    avgRating: number;
    lastUsed: string;
  };
}

export interface RegistryLookupResult {
  hit: boolean;
  entry?: RegistryEntry;
  fingerprint: string;
  source?: "memory" | "local-cache" | "ruixen.com" | "none";
  similarEntries?: {
    entry: RegistryEntry;
    similarity: number;
  }[];
}

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────

const memoryCache = new Map<string, RegistryEntry>();
const MEMORY_CACHE_MAX = 100;

function addToMemoryCache(entry: RegistryEntry): void {
  // LRU eviction
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(entry.fingerprint, entry);
}

function getFromMemoryCache(fingerprint: string): RegistryEntry | null {
  const entry = memoryCache.get(fingerprint);
  if (entry) {
    // Move to end (most recently used)
    memoryCache.delete(fingerprint);
    memoryCache.set(fingerprint, entry);
    return entry;
  }
  return null;
}

// ─── RUIXEN.COM REGISTRY LOOKUP ──────────────────────────────────

/**
 * Lookup component from ruixen.com (source of truth).
 * Returns component if found in the main registry.
 */
async function lookupFromRuixenRegistry(
  fingerprint: string,
  dna: ComponentDNA
): Promise<RegistryEntry | null> {
  try {
    const response = await fetch(`${RUIXEN_REGISTRY_URL}/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ fingerprint, dna }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      if (response.status === 404) return null; // No match
      throw new Error(`Registry returned ${response.status}`);
    }

    const data = await response.json();

    if (data.component) {
      return {
        id: data.component.id || `ruixen_${fingerprint}`,
        fingerprint,
        dna,
        code: data.component.code,
        metadata: {
          createdAt: data.component.createdAt || new Date().toISOString(),
          usageCount: data.component.usageCount || 0,
          successRate: data.component.successRate || 1.0,
          avgRating: data.component.avgRating || 5.0,
          lastUsed: new Date().toISOString(),
        },
      };
    }

    return null;
  } catch (error) {
    console.error("Ruixen registry lookup failed:", error);
    return null;
  }
}

// ─── REGISTRY OPERATIONS ─────────────────────────────────────────

/**
 * Look up component by DNA.
 *
 * Lookup order:
 * 1. Memory cache (instant)
 * 2. Local DB cache (fast)
 * 3. ruixen.com registry (source of truth)
 * 4. Miss → Generation fallback
 */
export async function lookupByDNA(
  dna: ComponentDNA,
  supabase: any
): Promise<RegistryLookupResult> {
  const fingerprint = createDNAFingerprint(dna);

  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: Memory cache (instant)
  // ═══════════════════════════════════════════════════════════════
  const cached = getFromMemoryCache(fingerprint);
  if (cached) {
    return {
      hit: true,
      entry: cached,
      fingerprint,
      source: "memory",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2: Local DB cache (fast)
  // ═══════════════════════════════════════════════════════════════
  try {
    const { data: localMatch } = await supabase
      .from("component_registry")
      .select("*")
      .eq("fingerprint", fingerprint)
      .single();

    if (localMatch) {
      const entry = dbRowToEntry(localMatch);
      addToMemoryCache(entry);

      // Update usage stats
      await supabase
        .from("component_registry")
        .update({
          usage_count: localMatch.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", localMatch.id);

      return {
        hit: true,
        entry,
        fingerprint,
        source: "local-cache",
      };
    }
  } catch {
    // No local cache, continue to ruixen.com
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 3: ruixen.com registry (source of truth)
  // ═══════════════════════════════════════════════════════════════
  const ruixenEntry = await lookupFromRuixenRegistry(fingerprint, dna);

  if (ruixenEntry) {
    // Cache locally for future lookups
    addToMemoryCache(ruixenEntry);

    // Also persist to local DB cache
    try {
      await supabase.from("component_registry").upsert({
        fingerprint,
        dna,
        code: ruixenEntry.code,
        usage_count: 1,
        success_rate: ruixenEntry.metadata.successRate,
        avg_rating: ruixenEntry.metadata.avgRating,
        source: "ruixen.com",
      });
    } catch {
      // Ignore cache write errors
    }

    return {
      hit: true,
      entry: ruixenEntry,
      fingerprint,
      source: "ruixen.com",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // NO MATCH - Return for generation fallback
  // ═══════════════════════════════════════════════════════════════
  return {
    hit: false,
    fingerprint,
    source: "none",
  };
}

/**
 * Submit generated component to ruixen.com for review.
 * Generated components can be promoted to the main registry.
 */
async function submitToRuixenRegistry(
  fingerprint: string,
  dna: ComponentDNA,
  code: string
): Promise<boolean> {
  try {
    const response = await fetch(`${RUIXEN_REGISTRY_URL}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fingerprint,
        dna,
        code,
        source: "mcp-generated",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    // Non-blocking - don't fail if submission fails
    return false;
  }
}

/**
 * Add generated component to registry.
 * 1. Cache locally for immediate reuse
 * 2. Submit to ruixen.com for potential promotion to main registry
 */
export async function addToRegistry(
  dna: ComponentDNA,
  code: string,
  supabase: any
): Promise<RegistryEntry | null> {
  const fingerprint = createDNAFingerprint(dna);

  try {
    // ═══════════════════════════════════════════════════════════════
    // LOCAL CACHE: Store for immediate reuse
    // ═══════════════════════════════════════════════════════════════
    const { data, error } = await supabase
      .from("component_registry")
      .insert({
        fingerprint,
        dna,
        code,
        usage_count: 1,
        success_rate: 1.0,
        avg_rating: 5.0,
        source: "mcp-generated",
      })
      .select()
      .single();

    if (error) {
      // Might be duplicate, try to fetch existing
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("component_registry")
          .select("*")
          .eq("fingerprint", fingerprint)
          .single();

        if (existing) {
          const entry = dbRowToEntry(existing);
          addToMemoryCache(entry);
          return entry;
        }
      }
      console.error("Registry insert error:", error);
      return null;
    }

    const entry = dbRowToEntry(data);
    addToMemoryCache(entry);

    // ═══════════════════════════════════════════════════════════════
    // SUBMIT TO RUIXEN.COM: For potential promotion to main registry
    // ═══════════════════════════════════════════════════════════════
    // Non-blocking - don't wait for response
    submitToRuixenRegistry(fingerprint, dna, code).catch(() => {});

    return entry;
  } catch (error) {
    console.error("Registry add error:", error);
    return null;
  }
}

/**
 * Update registry entry with feedback.
 */
export async function updateRegistryStats(
  fingerprint: string,
  feedback: { accepted: boolean; rating?: number },
  supabase: any
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from("component_registry")
      .select("usage_count, success_rate, avg_rating")
      .eq("fingerprint", fingerprint)
      .single();

    if (!current) return;

    const newUsageCount = current.usage_count + 1;
    const successDelta = feedback.accepted ? 1 : 0;
    const newSuccessRate =
      (current.success_rate * current.usage_count + successDelta) / newUsageCount;

    let newAvgRating = current.avg_rating;
    if (feedback.rating) {
      newAvgRating =
        (current.avg_rating * current.usage_count + feedback.rating) / newUsageCount;
    }

    await supabase
      .from("component_registry")
      .update({
        usage_count: newUsageCount,
        success_rate: newSuccessRate,
        avg_rating: newAvgRating,
        last_used: new Date().toISOString(),
      })
      .eq("fingerprint", fingerprint);

    // Invalidate memory cache
    memoryCache.delete(fingerprint);
  } catch (error) {
    console.error("Registry stats update error:", error);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────

function dbRowToEntry(row: any): RegistryEntry {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    dna: row.dna,
    code: row.code,
    metadata: {
      createdAt: row.created_at,
      usageCount: row.usage_count,
      successRate: row.success_rate,
      avgRating: row.avg_rating,
      lastUsed: row.last_used,
    },
  };
}

// ─── PREBUILT REGISTRY (Bundled) ─────────────────────────────────

/**
 * Prebuilt components that ship with the package.
 * Used when database unavailable.
 */
export const PREBUILT_REGISTRY: Map<string, RegistryEntry> = new Map();

// Initialize prebuilt registry with common patterns
export function initializePrebuiltRegistry(components: any[]): void {
  for (const comp of components) {
    if (comp.dna && comp.code) {
      const fingerprint = createDNAFingerprint(comp.dna);
      PREBUILT_REGISTRY.set(fingerprint, {
        id: `prebuilt_${comp.name}`,
        fingerprint,
        dna: comp.dna,
        code: comp.code,
        metadata: {
          createdAt: "2024-01-01T00:00:00Z",
          usageCount: 1000,
          successRate: 0.95,
          avgRating: 4.8,
          lastUsed: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * Lookup in prebuilt registry (fallback when no DB).
 */
export function lookupPrebuilt(dna: ComponentDNA): RegistryEntry | null {
  const fingerprint = createDNAFingerprint(dna);
  return PREBUILT_REGISTRY.get(fingerprint) || null;
}
