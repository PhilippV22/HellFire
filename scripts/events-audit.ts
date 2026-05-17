import { isHeadlinePlaceFragment, isLikelyNonEventText } from "@/lib/eventQuality";
import { isEventFresh } from "@/lib/eventLifecycle";
import type { CrisisEvent } from "@/types/events";

type ApiResponse = {
  data?: CrisisEvent[];
  source?: string;
  warning?: string;
};

const baseUrl = process.env.HELLFIRE_BASE_URL ?? "http://localhost:3000";

async function main() {
  const response = await fetch(`${baseUrl}/api/events`, {
    headers: { accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Event API returned ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse;
  const events = payload.data ?? [];
  const findings = auditEvents(events);

  process.stdout.write(`HellFire Event Audit\n`);
  process.stdout.write(`Source: ${payload.source ?? "unknown"}\n`);
  process.stdout.write(`Events: ${events.length}\n`);

  if (payload.warning) {
    process.stdout.write(`Warning: ${payload.warning}\n`);
  }

  for (const [name, items] of Object.entries(findings)) {
    process.stdout.write(`\n${name}: ${items.length}\n`);

    for (const event of items.slice(0, 12)) {
      process.stdout.write(
        `- ${event.id} | ${event.category} | ${event.locationName} | ` +
          `${event.title} | conf=${event.confidence.toFixed(3)} ` +
          `geo=${(event.geocodeConfidence ?? 0).toFixed(2)}\n`
      );
    }
  }
}

function auditEvents(events: CrisisEvent[]) {
  const now = Date.now();

  return {
    "Low geocode": events.filter((event) => (event.geocodeConfidence ?? 0) < 0.5),
    "Headline place fragments": events.filter(
      (event) =>
        isHeadlinePlaceFragment(event.locationName) ||
        isHeadlinePlaceFragment(event.placeName)
    ),
    "Possible non-events": events.filter((event) =>
      isLikelyNonEventText(`${event.title} ${event.description}`)
    ),
    "Single-source conflicts": events.filter(
      (event) => event.category === "conflict" && (event.sourceCount ?? event.sources.length) <= 1
    ),
    "Missing source URLs": events.filter((event) =>
      event.sources.some((source) => !source.url)
    ),
    "Stale by lifecycle": events.filter((event) => !isEventFresh(event, new Date(now)))
  };
}

main().catch((error) => {
  process.stderr.write(
    `events:audit failed: ${error instanceof Error ? error.message : "Unknown error"}\n`
  );
  process.exitCode = 1;
});
