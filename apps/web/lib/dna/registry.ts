/**
 * DNA REGISTRY
 *
 * Hash-based component lookup - ZERO AI tokens.
 * Same DNA fingerprint always returns same component.
 *
 * Registry flow:
 * 1. DNA → Fingerprint hash
 * 2. Hash → Database lookup
 * 3. Hit → Return cached component
 * 4. Miss → Generate, then cache for future
 */

import {
  ComponentDNA,
  createDNAFingerprint,
  calculateDNASimilarity,
} from "./schema";

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

// ─── REGISTRY OPERATIONS ─────────────────────────────────────────

/**
 * Look up component by DNA.
 * First checks memory cache, then database.
 */
export async function lookupByDNA(
  dna: ComponentDNA,
  supabase: any
): Promise<RegistryLookupResult> {
  const fingerprint = createDNAFingerprint(dna);

  // Check memory cache first
  const cached = getFromMemoryCache(fingerprint);
  if (cached) {
    return {
      hit: true,
      entry: cached,
      fingerprint,
    };
  }

  // Check database
  try {
    const { data: exactMatch } = await supabase
      .from("component_registry")
      .select("*")
      .eq("fingerprint", fingerprint)
      .single();

    if (exactMatch) {
      const entry = dbRowToEntry(exactMatch);
      addToMemoryCache(entry);

      // Update usage stats
      await supabase
        .from("component_registry")
        .update({
          usage_count: exactMatch.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", exactMatch.id);

      return {
        hit: true,
        entry,
        fingerprint,
      };
    }

    // No exact match, find similar entries
    const { data: allEntries } = await supabase
      .from("component_registry")
      .select("*")
      .eq("dna->>type", dna.type)
      .order("usage_count", { ascending: false })
      .limit(10);

    if (allEntries && allEntries.length > 0) {
      const similarEntries = allEntries
        .map((row: any) => ({
          entry: dbRowToEntry(row),
          similarity: calculateDNASimilarity(dna, row.dna),
        }))
        .filter((item: any) => item.similarity > 0.7)
        .sort((a: any, b: any) => b.similarity - a.similarity);

      return {
        hit: false,
        fingerprint,
        similarEntries: similarEntries.slice(0, 3),
      };
    }

    return {
      hit: false,
      fingerprint,
    };
  } catch (error) {
    console.error("Registry lookup error:", error);
    return {
      hit: false,
      fingerprint,
    };
  }
}

/**
 * Add generated component to registry.
 * Called after generation fallback.
 */
export async function addToRegistry(
  dna: ComponentDNA,
  code: string,
  supabase: any
): Promise<RegistryEntry | null> {
  const fingerprint = createDNAFingerprint(dna);

  try {
    const { data, error } = await supabase
      .from("component_registry")
      .insert({
        fingerprint,
        dna,
        code,
        usage_count: 1,
        success_rate: 1.0,
        avg_rating: 5.0,
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
