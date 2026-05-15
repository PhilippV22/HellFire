import { ingestSource, type IngestResult } from "@/lib/osint/ingest";
import type { SourceId } from "@/lib/osint/normalize";

type WorkerJob = {
  source: SourceId;
  intervalMs: number;
};

const jobs: WorkerJob[] = [
  { source: "gdelt", intervalMs: 15 * 60 * 1000 },
  { source: "gdelt-doc", intervalMs: 15 * 60 * 1000 },
  { source: "reliefweb", intervalMs: 30 * 60 * 1000 },
  { source: "usgs", intervalMs: 10 * 60 * 1000 },
  { source: "emsc", intervalMs: 10 * 60 * 1000 },
  { source: "gdacs", intervalMs: 15 * 60 * 1000 },
  { source: "conflict-news", intervalMs: 15 * 60 * 1000 },
  { source: "eonet", intervalMs: 30 * 60 * 1000 },
  { source: "rss", intervalMs: 30 * 60 * 1000 }
];

async function runJob(job: WorkerJob) {
  try {
    const result = await ingestSource(job.source);
    logResult(result);
  } catch (error) {
    process.stderr.write(
      `[worker] ${job.source} failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n`
    );
  }
}

function logResult(result: IngestResult) {
  process.stdout.write(
    `[worker] ${new Date().toISOString()} ${result.source}: ` +
      `${result.fetchedReports} fetched, ${result.eventsCreated} new, ` +
      `${result.eventsUpdated} updated, ${result.eventsArchived} archived, mode=${result.mode}` +
      `${result.warning ? `, warning=${result.warning}` : ""}\n`
  );
}

async function main() {
  process.stdout.write("[worker] HellFire worker started.\n");

  for (const job of jobs) {
    void runJob(job);
    setInterval(() => void runJob(job), job.intervalMs);
  }
}

void main();
