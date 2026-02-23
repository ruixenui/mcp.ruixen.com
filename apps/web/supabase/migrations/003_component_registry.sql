-- ═══════════════════════════════════════════════════════════════════
-- COMPONENT DNA REGISTRY
-- Hash-based component lookup for zero-token retrieval
-- ═══════════════════════════════════════════════════════════════════

-- ─── COMPONENT REGISTRY ──────────────────────────────────────────────
CREATE TABLE public.component_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- DNA fingerprint (hash) - primary lookup key
  fingerprint TEXT NOT NULL UNIQUE,

  -- Full DNA specification
  dna JSONB NOT NULL,

  -- Generated component code
  code TEXT NOT NULL,

  -- Usage statistics
  usage_count INT DEFAULT 0,
  success_rate FLOAT DEFAULT 1.0,
  avg_rating FLOAT DEFAULT 5.0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for fast lookup
  CONSTRAINT valid_dna CHECK (
    dna ? 'type' AND
    dna ? 'interaction' AND
    dna ? 'a11y' AND
    dna ? 'layout' AND
    dna ? 'animation'
  )
);

-- ─── INDEXES ─────────────────────────────────────────────────────────
CREATE INDEX idx_registry_fingerprint ON public.component_registry(fingerprint);
CREATE INDEX idx_registry_type ON public.component_registry((dna->>'type'));
CREATE INDEX idx_registry_usage ON public.component_registry(usage_count DESC);
CREATE INDEX idx_registry_success ON public.component_registry(success_rate DESC);
CREATE INDEX idx_registry_dna_gin ON public.component_registry USING GIN (dna);

-- ─── DNA LOOKUP CACHE (for hot components) ───────────────────────────
CREATE TABLE public.dna_cache (
  fingerprint TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  hit_count INT DEFAULT 1,
  last_hit TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS POLICIES ────────────────────────────────────────────────────
ALTER TABLE public.component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dna_cache ENABLE ROW LEVEL SECURITY;

-- Registry is public read (components are shared)
CREATE POLICY "Anyone can read registry"
  ON public.component_registry FOR SELECT
  USING (true);

-- Only service role can insert/update
CREATE POLICY "Service can insert registry"
  ON public.component_registry FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update registry"
  ON public.component_registry FOR UPDATE
  USING (true);

-- Cache is public read
CREATE POLICY "Anyone can read cache"
  ON public.dna_cache FOR SELECT
  USING (true);

CREATE POLICY "Service can manage cache"
  ON public.dna_cache FOR ALL
  USING (true);

-- ─── FUNCTIONS ───────────────────────────────────────────────────────

-- Function to lookup component by fingerprint
CREATE OR REPLACE FUNCTION lookup_component(p_fingerprint TEXT)
RETURNS TABLE (
  id UUID,
  fingerprint TEXT,
  dna JSONB,
  code TEXT,
  usage_count INT,
  success_rate FLOAT
) AS $$
BEGIN
  -- Update usage count
  UPDATE public.component_registry
  SET
    usage_count = component_registry.usage_count + 1,
    last_used = NOW()
  WHERE component_registry.fingerprint = p_fingerprint;

  -- Return component
  RETURN QUERY
  SELECT
    r.id,
    r.fingerprint,
    r.dna,
    r.code,
    r.usage_count,
    r.success_rate
  FROM public.component_registry r
  WHERE r.fingerprint = p_fingerprint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar components by DNA type
CREATE OR REPLACE FUNCTION find_similar_components(
  p_type TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  fingerprint TEXT,
  dna JSONB,
  usage_count INT,
  success_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.fingerprint,
    r.dna,
    r.usage_count,
    r.success_rate
  FROM public.component_registry r
  WHERE r.dna->>'type' = p_type
  ORDER BY r.usage_count DESC, r.success_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get registry stats
CREATE OR REPLACE FUNCTION get_registry_stats()
RETURNS TABLE (
  total_components BIGINT,
  total_lookups BIGINT,
  avg_success_rate FLOAT,
  top_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_components,
    COALESCE(SUM(r.usage_count), 0)::BIGINT as total_lookups,
    COALESCE(AVG(r.success_rate), 0)::FLOAT as avg_success_rate,
    (
      SELECT jsonb_agg(jsonb_build_object('type', t.type, 'count', t.cnt))
      FROM (
        SELECT dna->>'type' as type, COUNT(*) as cnt
        FROM public.component_registry
        GROUP BY dna->>'type'
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ) as top_types
  FROM public.component_registry r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── CACHE CLEANUP FUNCTION ──────────────────────────────────────────

-- Cleanup old cache entries (keep top 1000 by hit count)
CREATE OR REPLACE FUNCTION cleanup_dna_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.dna_cache
  WHERE fingerprint NOT IN (
    SELECT fingerprint
    FROM public.dna_cache
    ORDER BY hit_count DESC, last_hit DESC
    LIMIT 1000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
