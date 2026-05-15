import { NextResponse } from "next/server";
import { getConflictCountryBorders } from "@/lib/server/countryBorders";
import { getLiveProductionEvents } from "@/lib/server/liveEvents";
import { listEvents } from "@/lib/server/osintRepository";
import type {
  ConflictCountryOverlay,
  ConflictFrontlineOverlay,
  ConflictOverlayData,
  GeoPoint
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
  const conflictCountries = new Set(countries.map((country) => country.country));
  const frontlines = createPublicConflictCorridors(events, conflictCountries);
  const data: ConflictOverlayData = {
    countries,
    borderLines,
    frontlines,
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
    events,
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

function createPublicConflictCorridors(
  events: CrisisEvent[],
  conflictCountries: Set<string>
): ConflictFrontlineOverlay[] {
  const groups = new Map<string, CrisisEvent[]>();

  for (const event of events) {
    const country = normalizeEventCountry(event.country);

    if (!country || !conflictCountries.has(country) || !hasUsablePoint(event)) {
      continue;
    }

    const group = groups.get(country) ?? [];
    group.push(event);
    groups.set(country, group);
  }

  return Array.from(groups.entries())
    .map(([country, countryEvents]) => createCountryCorridor(country, countryEvents))
    .filter((corridor): corridor is ConflictFrontlineOverlay => Boolean(corridor))
    .sort((a, b) => b.eventCount - a.eventCount || b.confidence - a.confidence)
    .slice(0, 12);
}

function createCountryCorridor(
  country: string,
  events: CrisisEvent[]
): ConflictFrontlineOverlay | null {
  const points = dedupePoints(
    events.map((event) => ({
      latitude: event.latitude,
      longitude: event.longitude
    }))
  );

  if (points.length < 2) {
    return null;
  }

  const orderedPoints = orderCorridorPoints(points);
  const sampledPoints = samplePoints(orderedPoints, 12);
  const updatedAt = events
    .map((event) => event.detectedTime || event.eventTime)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const confidence =
    events.reduce((total, event) => total + event.confidence, 0) / events.length;

  return {
    id: `conflict-corridor-${hashString(
      `${country}:${sampledPoints.map((point) => `${point.latitude},${point.longitude}`).join(":")}`
    )}`,
    name: `Approximierter Konfliktkorridor: ${country}`,
    country,
    coordinates: sampledPoints,
    eventCount: events.length,
    confidence: roundConfidence(Math.min(0.74, confidence)),
    updatedAt: updatedAt || new Date().toISOString(),
    source: "Aggregierte oeffentliche Nachrichten- und Krisenfeeds",
    description:
      "Aggregierte zivile Lagevisualisierung aus geocodierten Meldungen; keine taktische Frontlinie und kein Truppen-Tracking."
  };
}

function orderCorridorPoints(points: GeoPoint[]) {
  const latitudeSpread =
    Math.max(...points.map((point) => point.latitude)) -
    Math.min(...points.map((point) => point.latitude));
  const longitudeSpread =
    Math.max(...points.map((point) => point.longitude)) -
    Math.min(...points.map((point) => point.longitude));

  return [...points].sort((a, b) =>
    longitudeSpread >= latitudeSpread
      ? a.longitude - b.longitude || a.latitude - b.latitude
      : a.latitude - b.latitude || a.longitude - b.longitude
  );
}

function samplePoints(points: GeoPoint[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  return Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * (points.length - 1));

    return points[sourceIndex];
  });
}

function dedupePoints(points: GeoPoint[]) {
  const seen = new Set<string>();
  const unique: GeoPoint[] = [];

  for (const point of points) {
    const key = `${Math.round(point.latitude * 8)}:${Math.round(point.longitude * 8)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(point);
  }

  return unique;
}

function hasUsablePoint(event: CrisisEvent) {
  return (
    Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude) &&
    Math.abs(event.latitude) <= 85 &&
    Math.abs(event.longitude) <= 180 &&
    event.confidence >= 0.25 &&
    (event.geocodeConfidence ?? 0.5) >= 0.42
  );
}

function isConflictEvent(event: CrisisEvent) {
  return event.category === "conflict";
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

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
