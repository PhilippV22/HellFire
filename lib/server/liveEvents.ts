import { localInfrastructure } from "@/data/localInfrastructure";
import { enrichEventQuality, assessEventQuality } from "@/lib/eventQuality";
import { createCivilImpactAnalysis } from "@/lib/osint/impact";
import { isEventFresh } from "@/lib/eventLifecycle";
import { getNearbyInfrastructure } from "@/lib/infrastructure";
import {
  fetchNormalizedReports,
  productionSourceIds
} from "@/lib/osint/ingest";
import type { NormalizedReport } from "@/lib/osint/normalize";
import type { AnalysisNote, CrisisEvent, EventDetail, RawReport } from "@/types/events";

type LiveCache = {
  version: string;
  expiresAt: number;
  events: CrisisEvent[];
  warnings: string[];
  reportsByEventId: Record<string, NormalizedReport[]>;
};

type GlobalWithLiveCache = typeof globalThis & {
  __hellfireLiveEventCache?: LiveCache;
};

const cacheTtlMs = 10 * 60 * 1000;
const cacheVersion = "production-live-v20-regional-quality-filters";

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

  const clustered = clusterLiveReports(reports);
  const nextCache = {
    version: cacheVersion,
    expiresAt: Date.now() + cacheTtlMs,
    events: clustered.events,
    warnings,
    reportsByEventId: clustered.reportsByEventId
  };
  globalWithCache.__hellfireLiveEventCache = nextCache;

  return nextCache;
}

export async function getLiveEventDetail(id: string): Promise<EventDetail | null> {
  const live = await getLiveProductionEvents();
  const event = live.events.find((item) => item.id === id);

  if (!event) {
    return null;
  }

  const reports = live.reportsByEventId[id] ?? [];
  const nearbyInfrastructure = getNearbyInfrastructure(event, localInfrastructure, 50);
  const evidence = assessLiveEvidence(reports);
  const analysisNotes = createLiveAnalysisNotes(event, reports, evidence);

  return {
    ...event,
    rawReports: reports.map(mapLiveRawReport),
    nearbyInfrastructure,
    analysisNotes
  };
}

function clusterLiveReports(reports: NormalizedReport[]) {
  const eventsByKey = new Map<string, CrisisEvent>();
  const reportsByKey = new Map<string, NormalizedReport[]>();

  for (const report of reports) {
    if (typeof report.latitude !== "number" || typeof report.longitude !== "number") {
      continue;
    }

    if (!isEventFresh(report)) {
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
      reportsByKey.set(key, [report]);
      continue;
    }

    if (
      !existing.sources.some(
        (source) =>
          source.name === report.sourceName &&
          source.url === report.url &&
          source.note === report.title
      )
    ) {
      existing.sources.push({
        name: report.sourceName,
        type: report.sourceId,
        url: report.url,
        note: report.title,
        ...reportSourceMeta(report)
      });
    }

    const eventReports = reportsByKey.get(key);

    if (
      eventReports &&
      !eventReports.some(
        (item) => item.sourceId === report.sourceId && item.externalId === report.externalId
      )
    ) {
      eventReports.push(report);
    }
    existing.sourceCount = new Set(existing.sources.map((source) => source.name)).size;
    existing.rawReportCount = (existing.rawReportCount ?? 1) + 1;
    existing.severity = Math.max(existing.severity, report.severity) as CrisisEvent["severity"];
    existing.confidence = Math.max(existing.confidence, report.confidence);
    existing.civilImpact = createCivilImpactAnalysis(existing);
  }

  const reportsByEventId: Record<string, NormalizedReport[]> = {};
  const events = Array.from(eventsByKey.entries()).map(([key, event]) => {
    const eventReports = reportsByKey.get(key) ?? [];
    const evidence = assessLiveEvidence(eventReports);
    const sourceCount = new Set(eventReports.map((report) => report.sourceName)).size || 1;
    const rawReportCount = eventReports.length || 1;
    const baseConfidence = Math.max(...eventReports.map((report) => report.confidence), event.confidence);
    const qualityFlags = evidence.contradictionDetected
      ? [...(event.qualityFlags ?? []), "conflicting-reports" as const]
      : event.qualityFlags;
    const confidence = Math.max(
      0.05,
      Math.min(
        0.98,
        baseConfidence +
          Math.max(0, sourceCount - 1) * 0.065 +
          Math.min(3, Math.max(0, rawReportCount - 1)) * 0.015 +
          evidence.confidenceBonus -
          evidence.confidencePenalty
      )
    );
    const enriched = enrichEventQuality({
      ...event,
      sourceCount,
      rawReportCount,
      confidence: Math.round(confidence * 1000) / 1000,
      qualityFlags,
      civilImpact: createCivilImpactAnalysis(event)
    });
    reportsByEventId[enriched.id] = eventReports;

    return enriched;
  });

  return {
    events: events
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime))
      .slice(0, 250),
    reportsByEventId
  };
}

function reportToEvent(report: NormalizedReport): CrisisEvent {
  const locationName = [report.placeName, report.region, report.country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ") || "Unbekannter Ort";

  return enrichEventQuality({
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
        note: report.title,
        ...reportSourceMeta(report)
      }
    ]
  });
}

function reportSourceMeta(report: NormalizedReport) {
  return {
    sourceCountry: stringValue(report.normalizedPayload.sourceCountry),
    sourceLanguage: stringValue(report.normalizedPayload.sourceLanguage)
  };
}

function assessLiveEvidence(reports: NormalizedReport[]) {
  const sourceCountries = new Set(
    reports
      .map((report) => stringValue(report.normalizedPayload.sourceCountry))
      .filter(Boolean)
  );
  const denialCount = reports.filter((report) =>
    hasDenialLanguage(`${report.title} ${report.description}`)
  ).length;
  const contradictionDetected = denialCount > 0 && denialCount < reports.length;
  const hasSpecificLocation = reports.some((report) => (report.geocodeConfidence ?? 0) >= 0.65);
  const confidenceBonus = Math.min(
    0.12,
    Math.max(0, sourceCountries.size - 1) * 0.025 + (hasSpecificLocation ? 0.02 : 0)
  );
  const confidencePenalty = contradictionDetected ? 0.1 : 0;
  const bestSupported = reports.reduce<NormalizedReport | undefined>((best, report) => {
    if (!best) {
      return report;
    }

    const reportScore = report.confidence + report.geocodeConfidence * 0.2;
    const bestScore = best.confidence + best.geocodeConfidence * 0.2;

    return reportScore > bestScore ? report : best;
  }, undefined);

  return {
    sourceCountries,
    contradictionDetected,
    confidenceBonus,
    confidencePenalty,
    bestSupported
  };
}

function createLiveAnalysisNotes(
  event: CrisisEvent,
  reports: NormalizedReport[],
  evidence: ReturnType<typeof assessLiveEvidence>
): AnalysisNote[] {
  const now = new Date().toISOString();
  const quality = assessEventQuality(event);
  const notes: AnalysisNote[] = [
    {
      id: `live-impact-${event.id}`,
      eventId: event.id,
      noteType: "impact",
      body: event.civilImpact,
      createdBy: "live-rule-engine",
      createdAt: now
    },
    {
      id: `live-quality-${event.id}`,
      eventId: event.id,
      noteType: "system",
      body:
        `Datenqualitaet: Ort=${quality.locationPrecision}, ` +
        `Verifikation=${quality.verificationStatus}, Flags=${quality.qualityFlags.join(", ") || "none"}.`,
      createdBy: "live-quality-audit",
      createdAt: now
    }
  ];

  if (reports.length > 1) {
    const sourceNames = new Set(reports.map((report) => report.sourceName));
    const best = evidence.bestSupported;
    notes.push({
      id: `live-evidence-${event.id}`,
      eventId: event.id,
      noteType: "system",
      body:
        `Quellenabgleich: ${reports.length} Rohberichte von ${sourceNames.size} Quellen ` +
        `aus ${evidence.sourceCountries.size || "unbekannten"} Herkunftsraeumen. ` +
        (evidence.contradictionDetected
          ? "Widerspruch/Bestreitung erkannt; Confidence wurde gebremst. "
          : "Keine direkte Bestreitung im Cluster erkannt. ") +
        (best ? `Staerker gewichtet: ${best.sourceName} - "${truncate(best.title, 130)}".` : ""),
      createdBy: "live-evidence-weighting",
      createdAt: now
    });
  }

  return notes;
}

function mapLiveRawReport(report: NormalizedReport): RawReport {
  return {
    id: `live-raw-${report.sourceId}-${hashString(report.externalId)}`,
    sourceId: report.sourceId,
    sourceName: report.sourceName,
    externalId: report.externalId,
    title: report.title,
    description: report.description,
    url: report.url,
    country: report.country,
    region: report.region,
    placeName: report.placeName,
    latitude: report.latitude,
    longitude: report.longitude,
    category: report.category,
    severity: report.severity,
    confidence: report.confidence,
    geocodeConfidence: report.geocodeConfidence,
    eventTime: report.eventTime,
    detectedTime: report.detectedTime,
    rawPayload: report.rawPayload,
    processedAt: report.detectedTime,
    createdAt: report.detectedTime
  };
}

function hasDenialLanguage(text: string) {
  return /(denies|denied|rejects|refutes|false|fake|not confirmed|unconfirmed|no evidence|опроверг|отрица|не подтверж|фейк|否认|驳斥|不实|未证实|没有证据)/i.test(
    text
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return "";
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
