ALTER TABLE events
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'events'::REGCLASS
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE FORMAT('ALTER TABLE events DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('unreviewed', 'confirmed', 'rejected', 'archived'));

CREATE INDEX IF NOT EXISTS events_archived_at_idx ON events (archived_at DESC);
