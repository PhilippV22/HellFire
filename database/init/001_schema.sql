CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS civil_events (
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
      'incident',
      'unverified'
    )
  ),
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  location_name TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  detected_time TIMESTAMPTZ NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  civil_impact TEXT NOT NULL,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civil_events_geom_idx
  ON civil_events
  USING GIST (geom);

CREATE INDEX IF NOT EXISTS civil_events_category_idx
  ON civil_events (category);

CREATE TABLE IF NOT EXISTS infrastructure_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  service_role TEXT NOT NULL,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS infrastructure_assets_geom_idx
  ON infrastructure_assets
  USING GIST (geom);
