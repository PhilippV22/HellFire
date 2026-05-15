CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS raw_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('gdelt', 'gdelt-doc', 'reliefweb', 'usgs', 'gdacs', 'eonet', 'emsc', 'conflict-news', 'rss', 'mock')
  ),
  base_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cadence_minutes INTEGER,
  last_ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'power',
      'oil',
      'hospital',
      'bridge',
      'rail',
      'water',
      'communication',
      'earthquake',
      'disaster',
      'protest',
      'conflict',
      'health',
      'incident',
      'unverified'
    )
  ),
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  country TEXT,
  region TEXT,
  place_name TEXT,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::GEOGRAPHY
  ) STORED,
  event_time TIMESTAMPTZ NOT NULL,
  detected_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (
    status IN ('unreviewed', 'confirmed', 'rejected')
  ),
  geocode_confidence NUMERIC(4, 3) NOT NULL DEFAULT 1 CHECK (
    geocode_confidence >= 0 AND geocode_confidence <= 1
  ),
  civil_impact TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 1,
  raw_report_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_reports (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES raw_sources(id),
  external_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  country TEXT,
  region TEXT,
  place_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  event_time TIMESTAMPTZ NOT NULL,
  detected_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  geocode_confidence NUMERIC(4, 3) NOT NULL DEFAULT 1 CHECK (
    geocode_confidence >= 0 AND geocode_confidence <= 1
  ),
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS event_sources (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  raw_report_id TEXT NOT NULL REFERENCES raw_reports(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES raw_sources(id),
  source_name TEXT NOT NULL,
  url TEXT,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, raw_report_id)
);

CREATE TABLE IF NOT EXISTS infrastructure (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  service_role TEXT NOT NULL,
  country TEXT,
  region TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::GEOGRAPHY
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_notes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('impact', 'admin', 'system')),
  body TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_geom_idx ON events USING GIST (geom);
CREATE INDEX IF NOT EXISTS events_category_idx ON events (category);
CREATE INDEX IF NOT EXISTS events_status_idx ON events (status);
CREATE INDEX IF NOT EXISTS events_country_region_idx ON events (country, region);
CREATE INDEX IF NOT EXISTS events_event_time_idx ON events (event_time DESC);
CREATE INDEX IF NOT EXISTS events_title_trgm_idx ON events USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS raw_reports_source_idx ON raw_reports (source_id);
CREATE INDEX IF NOT EXISTS raw_reports_category_idx ON raw_reports (category);
CREATE INDEX IF NOT EXISTS raw_reports_event_idx ON raw_reports (event_id);
CREATE INDEX IF NOT EXISTS raw_reports_detected_idx ON raw_reports (detected_time DESC);

CREATE INDEX IF NOT EXISTS event_sources_event_idx ON event_sources (event_id);
CREATE INDEX IF NOT EXISTS event_sources_source_idx ON event_sources (source_id);

CREATE INDEX IF NOT EXISTS infrastructure_geom_idx ON infrastructure USING GIST (geom);
CREATE INDEX IF NOT EXISTS infrastructure_country_region_idx ON infrastructure (country, region);
