import { ingestAllSources } from "@/lib/osint/ingest";
import { seedInfrastructure, seedSources } from "@/lib/server/osintRepository";

async function main() {
  await seedSources();
  await seedInfrastructure();
  const results = await ingestAllSources();

  for (const result of results) {
    process.stdout.write(
      `${result.source}: ${result.fetchedReports} reports, ${result.eventsCreated} new, ${result.eventsUpdated} updated, mode=${result.mode}${result.warning ? `, warning=${result.warning}` : ""}\n`
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
});
