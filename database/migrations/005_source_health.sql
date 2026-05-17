ALTER TABLE raw_sources
  ADD COLUMN IF NOT EXISTS source_country TEXT,
  ADD COLUMN IF NOT EXISTS source_language TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

CREATE INDEX IF NOT EXISTS raw_sources_country_idx
  ON raw_sources (source_country);

CREATE INDEX IF NOT EXISTS raw_sources_failure_idx
  ON raw_sources (failure_count DESC, last_error_at DESC);
