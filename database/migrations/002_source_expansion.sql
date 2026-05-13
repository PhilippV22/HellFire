ALTER TABLE raw_sources
  DROP CONSTRAINT IF EXISTS raw_sources_source_type_check;

ALTER TABLE raw_sources
  ADD CONSTRAINT raw_sources_source_type_check
  CHECK (
    source_type IN (
      'gdelt',
      'gdelt-doc',
      'reliefweb',
      'usgs',
      'gdacs',
      'eonet',
      'emsc',
      'rss',
      'mock'
    )
  );
