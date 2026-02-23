/**
 * RUIXEN DNA SYSTEM
 *
 * Zero-token component generation through structured DNA lookup.
 *
 * Token comparison:
 * - 21st.dev:  ~1000-2000 tokens per request
 * - v0:        ~3000-5000 tokens per request
 * - Ruixen:    ~200 tokens for parse + 0 for enrichment + 0 for lookup
 *              (generation only on registry miss, then cached forever)
 */

export * from "./schema";
export * from "./enrichment";
export * from "./parser";
export * from "./registry";
export * from "./validation";
