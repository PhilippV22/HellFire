import { createCivilImpactAnalysis } from "@/lib/osint/impact";
import {
  fetchNormalizedReports,
  productionSourceIds
} from "@/lib/osint/ingest";
import type { NormalizedReport } from "@/lib/osint/normalize";
import type { CrisisEvent } from "@/types/events";

type LiveCache = {
  version: string;
  expiresAt: number;
  events: CrisisEvent[];
  warnings: string[];
};

type GlobalWithLiveCache = typeof globalThis & {
  __hellfireLiveEventCache?: LiveCache;
};

const cacheTtlMs = 10 * 60 * 1000;
const cacheVersion = "production-live-v4-conflict-overlays";

export async function getLiveProductionEvents() {
  const globalWithCache = globalThis as GlobalWithLiveCache;
  const cached = globalWithCache.__hellfireLiveEventCache;

  if (cached && cached.version === cacheVersion && cached.expiresAt > Date.now()) {
    return cached;
  }

  const settled = await Promise.allSettled(
    productionSourceIds.map(async (sourceId) => {
      const result = await fetchNormalizedReports(sourceId);

      return {
        sourceId,
        ...result
      };
    })
  );
  const warnings: string[] = [];
  const reports: NormalizedReport[] = [];

  for (const result of settled) {
    if (result.status === "rejected") {
      warnings.push(result.reason instanceof Error ? result.reason.message : "Source failed");
      continue;
    }

    reports.push(...result.value.reports);

    if (result.value.warning) {
      warnings.push(`${result.value.sourceId}: ${result.value.warning}`);
    }
  }

  const events = clusterLiveReports(reports);
  const nextCache = {
    version: cacheVersion,
    expiresAt: Date.now() + cacheTtlMs,
    events,
    warnings
  };
  globalWithCache.__hellfireLiveEventCache = nextCache;

  return nextCache;
}

function clusterLiveReports(reports: NormalizedReport[]) {
  const eventsByKey = new Map<string, CrisisEvent>();

  for (const report of reports) {
    if (typeof report.latitude !== "number" || typeof report.longitude !== "number") {
      continue;
    }

    const key = [
      report.category,
      report.country || "",
      report.placeName || "",
      report.eventTime.slice(0, 10)
    ]
      .join(":")
      .toLowerCase();
    const existing = eventsByKey.get(key);

    if (!existing) {
      const event = reportToEvent(report);
      eventsByKey.set(key, event);
      continue;
    }

    existing.sources.push({
      name: report.sourceName,
      type: report.sourceId,
      url: report.url,
      note: report.title
    });
    existing.sourceCount = new Set(existing.sources.map((source) => source.name)).size;
    existing.rawReportCount = (existing.rawReportCount ?? 1) + 1;
    existing.severity = Math.max(existing.severity, report.severity) as CrisisEvent["severity"];
    existing.confidence = Math.min(
      0.98,
      Math.max(existing.confidence, report.confidence) +
        Math.max(0, (existing.sourceCount ?? 1) - 1) * 0.08
    );
    existing.civilImpact = createCivilImpactAnalysis(existing);
  }

  return Array.from(eventsByKey.values())
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime))
    .slice(0, 250);
}

function reportToEvent(report: NormalizedReport): CrisisEvent {
  const locationName = [report.placeName, report.region, report.country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ") || "Unbekannter Ort";

  return {
    id: `live-${report.sourceId}-${hashString(report.externalId)}`,
    title: report.title,
    description: report.description,
    category: report.category,
    severity: report.severity,
    confidence: report.confidence,
    latitude: report.latitude ?? 0,
    longitude: report.longitude ?? 0,
    locationName,
    country: report.country,
    region: report.region,
    placeName: report.placeName,
    eventTime: report.eventTime,
    detectedTime: report.detectedTime,
    civilImpact: createCivilImpactAnalysis({
      category: report.category,
      severity: report.severity,
      locationName
    }),
    status: "unreviewed",
    sourceCount: 1,
    rawReportCount: 1,
    geocodeConfidence: report.geocodeConfidence,
    sources: [
      {
        name: report.sourceName,
        type: report.sourceId,
        url: report.url,
        note: report.title
      }
    ]
  };
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
