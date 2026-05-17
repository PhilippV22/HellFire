import { NextResponse } from "next/server";
import { getGlobalConflictAdminRegions } from "@/lib/server/globalAdminRegions";
import { getConflictCountryBorders } from "@/lib/server/countryBorders";
import { getLiveProductionEvents } from "@/lib/server/liveEvents";
import { listEvents } from "@/lib/server/osintRepository";
import type {
  ConflictCountryOverlay,
  ConflictOverlayData,
} from "@/types/conflictOverlay";
import type { CrisisEvent } from "@/types/events";

type OverlaySource = "production" | "production-live";

export async function GET() {
  const { events, source, warnings } = await loadConflictEvents();
  const countries = createCountryOverlays(events);
  const borderLines = await getConflictCountryBorders(
    countries.map((country) => ({
      country: country.country,
      intensity: Math.max(country.eventCount, country.maxSeverity)
    }))
  );
  const adminRegions = await getGlobalConflictAdminRegions(events);
  const data: ConflictOverlayData = {
    countries,
    borderLines,
    adminRegions,
    frontlines: [],
    updatedAt: new Date().toISOString(),
    mode: "public-approximation"
  };

  return NextResponse.json({
    data,
    source,
    warning: warnings.filter(Boolean).join(" | ")
  });
}

async function loadConflictEvents(): Promise<{
  events: CrisisEvent[];
  source: OverlaySource;
  warnings: string[];
}> {
  const warnings: string[] = [];
  let storedEvents: CrisisEvent[] = [];

  try {
    storedEvents = await listEvents({
      categories: ["conflict"],
      minConfidence: 0.25
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Database unavailable");
  }

  const live = await getLiveProductionEvents();
  const events = mergeEventsById([
    ...storedEvents.filter(isConflictEvent),
    ...live.events.filter(isConflictEvent)
  ]);

  return {
    events: events.filter(isRecentOverlayEvent),
    source: live.events.length > 0 ? "production-live" : "production",
    warnings: [...warnings, ...live.warnings]
  };
}

function mergeEventsById(events: CrisisEvent[]) {
  const map = new Map<string, CrisisEvent>();

  for (const event of events) {
    map.set(event.id, event);
  }

  return Array.from(map.values());
}

function createCountryOverlays(events: CrisisEvent[]): ConflictCountryOverlay[] {
  const map = new Map<
    string,
    { eventCount: number; maxSeverity: number; confidenceTotal: number }
  >();

  for (const event of events) {
    const country = normalizeEventCountry(event.country);

    if (!country) {
      continue;
    }

    const current = map.get(country) ?? {
      eventCount: 0,
      maxSeverity: 1,
      confidenceTotal: 0
    };

    current.eventCount += 1;
    current.maxSeverity = Math.max(current.maxSeverity, event.severity);
    current.confidenceTotal += event.confidence;
    map.set(country, current);
  }

  return Array.from(map.entries())
    .map(([country, value]) => ({
      country,
      eventCount: value.eventCount,
      maxSeverity: value.maxSeverity,
      confidence: roundConfidence(value.confidenceTotal / value.eventCount)
    }))
    .filter((country) => country.eventCount >= 1 && country.confidence >= 0.25)
    .filter(isWarCountryOverlay)
    .sort(
      (a, b) =>
        b.maxSeverity - a.maxSeverity ||
        b.eventCount - a.eventCount ||
        b.confidence - a.confidence
    )
    .slice(0, 28);
}

function isConflictEvent(event: CrisisEvent) {
  return event.category === "conflict";
}

function isRecentOverlayEvent(event: CrisisEvent) {
  const time = Date.parse(event.detectedTime || event.eventTime);

  if (!Number.isFinite(time)) {
    return true;
  }

  return Date.now() - time <= 30 * 24 * 60 * 60 * 1000;
}

const knownConflictCountries = new Set([
  "Afghanistan",
  "Burkina Faso",
  "Haiti",
  "India",
  "Iran",
  "Iraq",
  "Israel",
  "Lebanon",
  "Libya",
  "Mali",
  "Myanmar",
  "Pakistan",
  "Palestinian Territories",
  "Russia",
  "Somalia",
  "Sudan",
  "Syria",
  "Ukraine",
  "Yemen"
]);

function isWarCountryOverlay(country: ConflictCountryOverlay) {
  return (
    knownConflictCountries.has(country.country) ||
    (country.eventCount >= 2 && country.maxSeverity >= 4)
  );
}

function normalizeEventCountry(country?: string) {
  const trimmed = country?.trim();

  if (!trimmed || trimmed.toLowerCase() === "unknown") {
    return "";
  }

  return trimmed;
}

function roundConfidence(value: number) {
  return Math.round(value * 100) / 100;
}
