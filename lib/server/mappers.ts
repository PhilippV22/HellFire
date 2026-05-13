import type {
  AnalysisNote,
  CrisisEvent,
  CrisisSource,
  EventCategory,
  EventStatus,
  InfrastructureAsset,
  InfrastructureType,
  RawReport,
  TimelineBucket
} from "@/types/events";

type DbRow = Record<string, unknown>;

export function mapEventRow(row: DbRow, sources: CrisisSource[] = []): CrisisEvent {
  return {
    id: stringValue(row.id),
    title: stringValue(row.title),
    description: stringValue(row.description),
    category: stringValue(row.category) as EventCategory,
    severity: numberValue(row.severity) as 1 | 2 | 3 | 4 | 5,
    confidence: numberValue(row.confidence),
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude),
    locationName: stringValue(row.location_name),
    country: optionalString(row.country),
    region: optionalString(row.region),
    placeName: optionalString(row.place_name),
    eventTime: dateIso(row.event_time),
    detectedTime: dateIso(row.detected_time),
    sources,
    civilImpact: stringValue(row.civil_impact),
    status: stringValue(row.status) as EventStatus,
    sourceCount: numberValue(row.source_count),
    rawReportCount: numberValue(row.raw_report_count),
    geocodeConfidence: numberValue(row.geocode_confidence),
    updatedAt: dateIso(row.updated_at)
  };
}

export function mapSourceRow(row: DbRow): CrisisSource {
  return {
    name: stringValue(row.source_name),
    type: sourceTypeFromId(stringValue(row.source_id)),
    url: optionalString(row.url),
    note: stringValue(row.title) || "OSINT report",
    reportId: stringValue(row.raw_report_id)
  };
}

export function mapRawReportRow(row: DbRow): RawReport {
  return {
    id: stringValue(row.id),
    sourceId: stringValue(row.source_id),
    sourceName: stringValue(row.source_name),
    externalId: stringValue(row.external_id),
    title: stringValue(row.title),
    description: stringValue(row.description),
    url: optionalString(row.url),
    country: optionalString(row.country),
    region: optionalString(row.region),
    placeName: optionalString(row.place_name),
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    category: stringValue(row.category) as EventCategory,
    severity: numberValue(row.severity) as 1 | 2 | 3 | 4 | 5,
    confidence: numberValue(row.confidence),
    geocodeConfidence: numberValue(row.geocode_confidence),
    eventTime: dateIso(row.event_time),
    detectedTime: dateIso(row.detected_time),
    eventId: optionalString(row.event_id),
    rawPayload: row.raw_payload,
    processedAt: optionalDateIso(row.processed_at),
    createdAt: optionalDateIso(row.created_at)
  };
}

export function mapInfrastructureRow(row: DbRow): InfrastructureAsset {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    type: stringValue(row.type) as InfrastructureType,
    serviceRole: stringValue(row.service_role),
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude),
    country: optionalString(row.country),
    region: optionalString(row.region)
  };
}

export function mapAnalysisNoteRow(row: DbRow): AnalysisNote {
  return {
    id: stringValue(row.id),
    eventId: stringValue(row.event_id),
    noteType: stringValue(row.note_type) as AnalysisNote["noteType"],
    body: stringValue(row.body),
    createdBy: stringValue(row.created_by),
    createdAt: dateIso(row.created_at)
  };
}

export function mapTimelineRow(row: DbRow): TimelineBucket {
  return {
    day: stringValue(row.day),
    category: stringValue(row.category) as EventCategory,
    country: optionalString(row.country),
    region: optionalString(row.region),
    count: numberValue(row.count),
    maxSeverity: numberValue(row.max_severity)
  };
}

function sourceTypeFromId(sourceId: string): CrisisSource["type"] {
  if (
    sourceId === "gdelt" ||
    sourceId === "gdelt-doc" ||
    sourceId === "reliefweb" ||
    sourceId === "usgs" ||
    sourceId === "gdacs" ||
    sourceId === "eonet" ||
    sourceId === "emsc"
  ) {
    return sourceId;
  }

  if (sourceId === "rss") {
    return "rss";
  }

  return "media";
}

function dateIso(value: unknown) {
  return optionalDateIso(value) || new Date().toISOString();
}

function optionalDateIso(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value) {
    return new Date(value).toISOString();
  }

  return undefined;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return "";
}

function optionalString(value: unknown) {
  const string = stringValue(value);

  return string || undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return numberValue(value);
}
