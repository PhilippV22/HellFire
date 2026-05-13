import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://hellfire:hellfire_dev_password@localhost:5432/hellfire";

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{ deleted_events: string }>(
      `WITH mock_raw_reports AS (
         SELECT id
         FROM raw_reports
         WHERE external_id LIKE 'mock-%'
           OR url LIKE 'https://example.local/%'
       ),
       mock_events AS (
         SELECT DISTINCT event_id AS id
         FROM event_sources
         WHERE raw_report_id IN (SELECT id FROM mock_raw_reports)
           AND event_id IS NOT NULL
       ),
       deleted_notes AS (
         DELETE FROM analysis_notes
         WHERE event_id IN (SELECT id FROM mock_events)
       ),
       deleted_sources AS (
         DELETE FROM event_sources
         WHERE event_id IN (SELECT id FROM mock_events)
            OR raw_report_id IN (SELECT id FROM mock_raw_reports)
       ),
       deleted_reports AS (
         DELETE FROM raw_reports
         WHERE id IN (SELECT id FROM mock_raw_reports)
       ),
       deleted_events AS (
         DELETE FROM events
         WHERE id IN (SELECT id FROM mock_events)
         RETURNING id
       )
       SELECT COUNT(*)::TEXT AS deleted_events FROM deleted_events`
    );
    await client.query("COMMIT");
    process.stdout.write(
      `Deleted ${result.rows[0]?.deleted_events ?? "0"} generated event(s).\n`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
});
