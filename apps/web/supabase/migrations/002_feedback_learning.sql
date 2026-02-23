-- ═══════════════════════════════════════════════════════════════════
-- RUIXEN LEARNING SYSTEM - Feedback & Pattern Analytics
-- ═══════════════════════════════════════════════════════════════════

-- ─── GENERATION FEEDBACK ─────────────────────────────────────────────
-- Tracks user actions on generated components
CREATE TABLE public.generation_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Action taken by user
  action TEXT NOT NULL CHECK (action IN ('accepted', 'edited', 'rejected', 'regenerated')),

  -- Code tracking
  original_code TEXT,
  edited_code TEXT,

  -- Structured diff for learning
  edits JSONB DEFAULT '[]', -- Array of {type, path, before, after}

  -- Optional feedback
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,

  -- Component metadata for pattern learning
  detected_category TEXT,
  detected_features JSONB DEFAULT '[]',
  spring_config JSONB, -- What spring values were used
  has_audio BOOLEAN DEFAULT false,

  -- Timing
  time_to_action_ms INT, -- How long before user took action

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PATTERN ANALYTICS ───────────────────────────────────────────────
-- Aggregated statistics per pattern
CREATE TABLE public.pattern_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  pattern_key TEXT NOT NULL, -- e.g., 'springOnPress', 'hoverEffect'

  -- Usage counts
  total_uses INT DEFAULT 0,
  accepted_count INT DEFAULT 0,
  edited_count INT DEFAULT 0,
  rejected_count INT DEFAULT 0,

  -- Success metrics
  success_rate FLOAT DEFAULT 0, -- accepted / total
  edit_rate FLOAT DEFAULT 0,    -- edited / total

  -- Learned optimal values
  optimal_spring JSONB, -- { stiffness, damping, mass }
  common_edits JSONB DEFAULT '[]', -- Most frequent user edits

  -- Confidence
  sample_size INT DEFAULT 0,
  confidence FLOAT DEFAULT 0, -- 0-1, based on sample size

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(category, pattern_key)
);

-- ─── LEARNED PATTERNS ────────────────────────────────────────────────
-- Dynamic patterns that improve over time
CREATE TABLE public.learned_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  version INT DEFAULT 1,

  -- The learned pattern data
  pattern JSONB NOT NULL,
  spring_presets JSONB, -- Optimized spring values for this category

  -- Performance tracking
  success_rate FLOAT DEFAULT 0,
  total_uses INT DEFAULT 0,

  -- Versioning
  is_active BOOLEAN DEFAULT true,
  parent_version_id UUID REFERENCES public.learned_patterns(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(category, version)
);

-- ─── SPRING VALUE TRACKING ───────────────────────────────────────────
-- Track which spring values perform best
CREATE TABLE public.spring_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,

  -- Spring configuration
  stiffness INT NOT NULL,
  damping INT NOT NULL,
  mass FLOAT DEFAULT 1,

  -- Performance
  uses INT DEFAULT 0,
  accepts INT DEFAULT 0,
  edits INT DEFAULT 0,

  -- What users typically change it to
  edited_to_stiffness INT,
  edited_to_damping INT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(category, stiffness, damping, mass)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────
CREATE INDEX idx_feedback_generation ON public.generation_feedback(generation_id);
CREATE INDEX idx_feedback_user ON public.generation_feedback(user_id);
CREATE INDEX idx_feedback_action ON public.generation_feedback(action);
CREATE INDEX idx_feedback_category ON public.generation_feedback(detected_category);
CREATE INDEX idx_analytics_category ON public.pattern_analytics(category);
CREATE INDEX idx_learned_active ON public.learned_patterns(is_active) WHERE is_active = true;
CREATE INDEX idx_spring_category ON public.spring_analytics(category);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────
ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spring_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.generation_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.generation_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Analytics are public read (aggregated data)
CREATE POLICY "Anyone can view analytics"
  ON public.pattern_analytics FOR SELECT
  USING (true);

-- Learned patterns are public read
CREATE POLICY "Anyone can view learned patterns"
  ON public.learned_patterns FOR SELECT
  USING (is_active = true);

-- Spring analytics public read
CREATE POLICY "Anyone can view spring analytics"
  ON public.spring_analytics FOR SELECT
  USING (true);

-- ─── FUNCTIONS ───────────────────────────────────────────────────────

-- Function to update pattern analytics after feedback
CREATE OR REPLACE FUNCTION update_pattern_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert pattern analytics
  INSERT INTO public.pattern_analytics (category, pattern_key, total_uses, accepted_count, edited_count, rejected_count)
  VALUES (
    NEW.detected_category,
    'overall',
    1,
    CASE WHEN NEW.action = 'accepted' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action = 'edited' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action IN ('rejected', 'regenerated') THEN 1 ELSE 0 END
  )
  ON CONFLICT (category, pattern_key) DO UPDATE SET
    total_uses = pattern_analytics.total_uses + 1,
    accepted_count = pattern_analytics.accepted_count + CASE WHEN NEW.action = 'accepted' THEN 1 ELSE 0 END,
    edited_count = pattern_analytics.edited_count + CASE WHEN NEW.action = 'edited' THEN 1 ELSE 0 END,
    rejected_count = pattern_analytics.rejected_count + CASE WHEN NEW.action IN ('rejected', 'regenerated') THEN 1 ELSE 0 END,
    success_rate = (pattern_analytics.accepted_count + CASE WHEN NEW.action = 'accepted' THEN 1 ELSE 0 END)::FLOAT / (pattern_analytics.total_uses + 1),
    edit_rate = (pattern_analytics.edited_count + CASE WHEN NEW.action = 'edited' THEN 1 ELSE 0 END)::FLOAT / (pattern_analytics.total_uses + 1),
    sample_size = pattern_analytics.total_uses + 1,
    confidence = LEAST(1.0, (pattern_analytics.total_uses + 1)::FLOAT / 100),
    updated_at = NOW();

  -- Update spring analytics if spring config present
  IF NEW.spring_config IS NOT NULL THEN
    INSERT INTO public.spring_analytics (category, stiffness, damping, mass, uses, accepts, edits)
    VALUES (
      NEW.detected_category,
      (NEW.spring_config->>'stiffness')::INT,
      (NEW.spring_config->>'damping')::INT,
      COALESCE((NEW.spring_config->>'mass')::FLOAT, 1),
      1,
      CASE WHEN NEW.action = 'accepted' THEN 1 ELSE 0 END,
      CASE WHEN NEW.action = 'edited' THEN 1 ELSE 0 END
    )
    ON CONFLICT (category, stiffness, damping, mass) DO UPDATE SET
      uses = spring_analytics.uses + 1,
      accepts = spring_analytics.accepts + CASE WHEN NEW.action = 'accepted' THEN 1 ELSE 0 END,
      edits = spring_analytics.edits + CASE WHEN NEW.action = 'edited' THEN 1 ELSE 0 END,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update analytics
CREATE TRIGGER on_feedback_insert
  AFTER INSERT ON public.generation_feedback
  FOR EACH ROW EXECUTE FUNCTION update_pattern_analytics();

-- Function to get optimal spring for a category
CREATE OR REPLACE FUNCTION get_optimal_spring(p_category TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'stiffness', stiffness,
    'damping', damping,
    'mass', mass,
    'confidence', (accepts::FLOAT / NULLIF(uses, 0))
  ) INTO result
  FROM public.spring_analytics
  WHERE category = p_category
    AND uses >= 5 -- Minimum sample size
  ORDER BY (accepts::FLOAT / NULLIF(uses, 0)) DESC
  LIMIT 1;

  RETURN COALESCE(result, '{"stiffness": 400, "damping": 28, "mass": 1}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
