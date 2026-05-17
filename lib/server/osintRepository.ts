import type { PoolClient } from "pg";
import { localInfrastructure } from "@/data/localInfrastructure";
import { osintSources } from "@/data/osintSources";
import {
  globalRssSources,
  sourceToRawSourceId,
  summarizeSourceCoverage
} from "@/data/sourceCatalog";
import { getEventRetentionHours } from "@/lib/eventLifecycle";
import { createCivilImpactAnalysis } from "@/lib/osint/impact";
import type { FeedLoadStat } from "@/lib/osint/ingest";
import type { NormalizedReport } from "@/lib/osint/normalize";
import { query, withClient } from "@/lib/server/db";
import {
  mapAnalysisNoteRow,
  mapEventRow,
  mapInfrastructureRow,
  mapRawReportRow,
  mapSourceRow,
  mapTimelineRow
} from "@/lib/server/mappers";
import type {
  CrisisEvent,
  EventCategory,
  EventDetail,
  EventFilters,
  EventStatus,
  RawReport
} from "@/types/events";

type IngestStats = {
  rawReports: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsArchived: number;
  skipped: number;
};

type StoredReportResult = {
  eventId?: string;
  created: boolean;
  skipped: boolean;
};

type EventRow = Record<string, unknown>;

type EvidenceReport = {
  sourceName: string;
  sourceCountry: string;
  sourceLanguage: string;
  title: string;
  description: string;
  confidence: number;
  geocodeConfidence: number;
  hasSpecificLocation: boolean;
  denialLanguage: boolean;
  score: number;
};

type EvidenceAssessment = {
  independentCountryCount: number;
  contradictionDetected: boolean;
  confidenceBonus: number;
  confidencePenalty: number;
  noteBody?: string;
};

export async function seedSources() {
  for (const source of osintSources) {
    await query(
      `INSERT INTO raw_sources
        (id, name, source_type, base_url, cadence_minutes, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
       ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        cadence_minutes = EXCLUDED.cadence_minutes,
        updated_at = NOW()`,
      [
        source.id,
        source.name,
        source.sourceType,
        source.baseUrl,
        source.cadenceMinutes ?? null
      ]
    );
  }

  for (const source of globalRssSources) {
    await query(
      `INSERT INTO raw_sources
        (id, name, source_type, base_url, cadence_minutes, enabled,
         source_country, source_language, tags, updated_at)
       VALUES ($1, $2, 'rss', $3, $4, $5, $6, $7, $8::JSONB, NOW())
       ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        cadence_minutes = EXCLUDED.cadence_minutes,
        enabled = EXCLUDED.enabled,
        source_country = EXCLUDED.source_country,
        source_language = EXCLUDED.source_language,
        tags = EXCLUDED.tags,
        updated_at = NOW()`,
      [
        sourceToRawSourceId(source),
        source.name,
        source.url,
        source.cadenceMinutes,
        source.enabled,
        source.country,
        source.language,
        JSON.stringify(source.tags)
      ]
    );
  }
}

export async function recordRssFeedHealth(stats: FeedLoadStat[]) {
  if (stats.length === 0) {
    return;
  }

  for (const stat of stats) {
    if (stat.ok) {
      await query(
        `UPDATE raw_sources
         SET last_success_at = NOW(),
             last_error = NULL,
             failure_count = 0,
             disabled_reason = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [stat.feedId]
      );
      continue;
    }

    await query(
      `UPDATE raw_sources
       SET last_error_at = NOW(),
           last_error = $2,
           failure_count = failure_count + 1,
           disabled_reason = CASE
             WHEN failure_count + 1 >= 10 THEN 'temporary-backoff'
             ELSE disabled_reason
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [stat.feedId, stat.error ?? "Feed unavailable"]
    );
  }
}

export async function listSourceHealth() {
  const coverage = summarizeSourceCoverage();
  const result = await query<Record<string, unknown>>(
    `SELECT id, name, source_type, base_url, enabled, cadence_minutes,
            source_country, source_language, tags, last_ingested_at,
            last_success_at, last_error_at, last_error, failure_count,
            disabled_reason, updated_at
     FROM raw_sources
     WHERE id LIKE 'rss:%'
     ORDER BY failure_count DESC, last_error_at DESC NULLS LAST, name ASC
     LIMIT 1000`
  );

  return {
    coverage,
    sources: result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      sourceType: String(row.source_type),
      url: optionalString(row.base_url),
      enabled: Boolean(row.enabled),
      cadenceMinutes: optionalNumber(row.cadence_minutes),
      country: optionalString(row.source_country),
      language: optionalString(row.source_language),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      lastIngestedAt: optionalString(row.last_ingested_at),
      lastSuccessAt: optionalString(row.last_success_at),
      lastErrorAt: optionalString(row.last_error_at),
      lastError: optionalString(row.last_error),
      failureCount: optionalNumber(row.failure_count) ?? 0,
      disabledReason: optionalString(row.disabled_reason),
      updatedAt: optionalString(row.updated_at)
    }))
  };
}

export async function seedInfrastructure() {
  for (const asset of localInfrastructure) {
    await query(
      `INSERT INTO infrastructure
        (id, name, type, service_role, country, region, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        service_role = EXCLUDED.service_role,
        country = EXCLUDED.country,
        region = EXCLUDED.region,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = NOW()`,
      [
        asset.id,
        asset.name,
        asset.type,
        asset.serviceRole,
        asset.country ?? inferCountry(asset.name),
        asset.region ?? null,
        asset.latitude,
        asset.longitude
      ]
    );
  }
}

export async function storeNormalizedReports(
  reports: NormalizedReport[]
): Promise<IngestStats> {
  await seedSources();
  const stats: IngestStats = {
    rawReports: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsArchived: 0,
    skipped: 0
  };

  for (const report of reports) {
    const result = await storeNormalizedReport(report);
    stats.rawReports += result.skipped ? 0 : 1;
    stats.skipped += result.skipped ? 1 : 0;
    stats.eventsCreated += result.created ? 1 : 0;
    stats.eventsUpdated += !result.created && !result.skipped ? 1 : 0;
  }

  stats.eventsArchived = await archiveExpiredEvents();

  return stats;
}

export async function listEvents(
  filters: Partial<EventFilters> = {},
  options: { includeRejected?: boolean } = {}
) {
  await archiveExpiredEvents();

  const where: string[] = [
    options.includeRejected ? "TRUE" : "status NOT IN ('rejected', 'archived')"
  ];
  const values: unknown[] = [];

  if (filters.categories?.length) {
    values.push(filters.categories);
    where.push(`category = ANY($${values.length}::TEXT[])`);
  }

  if (filters.minSeverity) {
    values.push(filters.minSeverity);
    where.push(`severity >= $${values.length}`);
  }

  if (filters.minConfidence) {
    values.push(filters.minConfidence);
    where.push(`confidence >= $${values.length}`);
  }

  if (filters.country) {
    values.push(filters.country);
    where.push(`country = $${values.length}`);
  }

  if (filters.region) {
    values.push(filters.region);
    where.push(`(region = $${values.length} OR location_name ILIKE '%' || $${values.length} || '%')`);
  }

  const result = await query<EventRow>(
    `SELECT *
     FROM events
     WHERE ${where.join(" AND ")}
     ORDER BY event_time DESC
     LIMIT 500`,
    values
  );
  const sourceMap = await getSourcesForEvents(result.rows.map((row) => String(row.id)));

  return result.rows.map((row) => mapEventRow(row, sourceMap.get(String(row.id)) ?? []));
}

export async function getEventDetail(
  eventId: string,
  options: { includeInactive?: boolean } = {}
): Promise<EventDetail | null> {
  await archiveExpiredEvents();

  const eventResult = await query<EventRow>(
    `SELECT *
     FROM events
     WHERE id = $1
       ${options.includeInactive ? "" : "AND status NOT IN ('rejected', 'archived')"}`,
    [eventId]
  );
  const eventRow = eventResult.rows[0];

  if (!eventRow) {
    return null;
  }

  const sourcesResult = await query<EventRow>(
    `SELECT raw_report_id, source_id, source_name, url, title
     FROM event_sources
     WHERE event_id = $1
     ORDER BY created_at DESC`,
    [eventId]
  );
  const rawResult = await query<EventRow>(
    `SELECT *
     FROM raw_reports
     WHERE event_id = $1
     ORDER BY detected_time DESC`,
    [eventId]
  );
  const notesResult = await query<EventRow>(
    `SELECT *
     FROM analysis_notes
     WHERE event_id = $1
     ORDER BY created_at DESC`,
    [eventId]
  );
  const event = mapEventRow(eventRow, sourcesResult.rows.map(mapSourceRow));
  const nearbyInfrastructure = await findNearbyInfrastructure(event, 50);

  return {
    ...event,
    rawReports: rawResult.rows.map(mapRawReportRow),
    nearbyInfrastructure,
    analysisNotes: notesResult.rows.map(mapAnalysisNoteRow)
  };
}

export async function listInfrastructure() {
  const result = await query<EventRow>(
    `SELECT *
     FROM infrastructure
     ORDER BY country NULLS LAST, region NULLS LAST, name ASC`
  );

  return result.rows.map(mapInfrastructureRow);
}

export async function findNearbyInfrastructure(
  event: Pick<CrisisEvent, "latitude" | "longitude">,
  radiusKm = 50
) {
  const result = await query<EventRow>(
    `SELECT *, ST_Distance(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
      ) / 1000 AS distance_km
     FROM infrastructure
     WHERE ST_DWithin(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
        $3
     )
     ORDER BY distance_km ASC
     LIMIT 20`,
    [event.longitude, event.latitude, radiusKm * 1000]
  );

  return result.rows.map((row) => ({
    ...mapInfrastructureRow(row),
    distanceKm: Number(row.distance_km)
  }));
}

export async function listTimeline(filters: { country?: string; region?: string } = {}) {
  await archiveExpiredEvents();

  const where: string[] = ["status NOT IN ('rejected', 'archived')"];
  const values: unknown[] = [];

  if (filters.country) {
    values.push(filters.country);
    where.push(`country = $${values.length}`);
  }

  if (filters.region) {
    values.push(filters.region);
    where.push(`region = $${values.length}`);
  }

  const result = await query<EventRow>(
    `SELECT
        TO_CHAR(DATE_TRUNC('day', event_time), 'YYYY-MM-DD') AS day,
        category,
        country,
        region,
        COUNT(*)::INTEGER AS count,
        MAX(severity)::INTEGER AS max_severity
     FROM events
     WHERE ${where.join(" AND ")}
     GROUP BY day, category, country, region
     ORDER BY day DESC, max_severity DESC
     LIMIT 120`,
    values
  );

  return result.rows.map(mapTimelineRow);
}

export async function listRawReports(limit = 120): Promise<RawReport[]> {
  const result = await query<EventRow>(
    `SELECT *
     FROM raw_reports
     ORDER BY detected_time DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(mapRawReportRow);
}

export async function updateEventAdmin(
  eventId: string,
  input: {
    status?: EventStatus;
    confidence?: number;
    category?: EventCategory;
  }
) {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.status) {
    values.push(input.status);
    updates.push(`status = $${values.length}`);
    updates.push(
      `archived_at = CASE
        WHEN $${values.length} = 'archived' THEN COALESCE(archived_at, NOW())
        ELSE NULL
      END`
    );
  }

  if (typeof input.confidence === "number") {
    values.push(Math.min(1, Math.max(0, input.confidence)));
    updates.push(`confidence = $${values.length}`);
  }

  if (input.category) {
    values.push(input.category);
    updates.push(`category = $${values.length}`);
  }

  if (updates.length === 0) {
    return getEventDetail(eventId, { includeInactive: true });
  }

  values.push(eventId);
  const result = await query<EventRow>(
    `UPDATE events
     SET ${updates.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  await query(
    `INSERT INTO analysis_notes (id, event_id, note_type, body, created_by)
     VALUES ($1, $2, 'admin', $3, 'local-admin')`,
    [
      `note-${hashString(`${eventId}:${Date.now()}`)}`,
      eventId,
      `Admin update: ${Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")}`
    ]
  );

  return getEventDetail(eventId, { includeInactive: true });
}

export async function archiveExpiredEvents() {
  const result = await query<EventRow>(
    `UPDATE events
     SET status = 'archived',
         archived_at = COALESCE(archived_at, NOW()),
         updated_at = NOW()
     WHERE status NOT IN ('rejected', 'archived')
       AND GREATEST(event_time, detected_time) <
         NOW() - ${retentionIntervalSql()}
     RETURNING id`
  );

  if (result.rows.length > 0) {
    await query(
      `INSERT INTO analysis_notes (id, event_id, note_type, body, created_by)
       SELECT
         'note-' || MD5(id || ':archived:' || archived_at::TEXT),
         id,
         'system',
         'Event automatisch archiviert, weil kein aktuelles Update innerhalb des Kategorie-Zeitfensters vorliegt.',
         'lifecycle'
       FROM events
       WHERE id = ANY($1::TEXT[])
       ON CONFLICT (id) DO NOTHING`,
      [result.rows.map((row) => String(row.id))]
    );
  }

  return result.rows.length;
}

async function storeNormalizedReport(
  report: NormalizedReport
): Promise<StoredReportResult> {
  return withClient(async (client) => {
    const reportId = `raw-${report.sourceId}-${hashString(report.externalId)}`;
    const latitude = report.latitude ?? 0;
    const longitude = report.longitude ?? 0;

    if (report.latitude === undefined || report.longitude === undefined) {
      report.confidence = Math.min(report.confidence, 0.28);
      report.geocodeConfidence = Math.min(report.geocodeConfidence, 0.2);
    }

    const rawResult = await client.query<EventRow>(
      `INSERT INTO raw_reports
        (
          id,
          source_id,
          external_id,
          source_name,
          title,
          description,
          url,
          country,
          region,
          place_name,
          latitude,
          longitude,
          event_time,
          detected_time,
          category,
          severity,
          confidence,
          geocode_confidence,
          raw_payload,
          normalized_payload,
          processed_at,
          updated_at
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19::JSONB, $20::JSONB, NOW(), NOW())
       ON CONFLICT (source_id, external_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        url = EXCLUDED.url,
        country = EXCLUDED.country,
        region = EXCLUDED.region,
        place_name = EXCLUDED.place_name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        event_time = EXCLUDED.event_time,
        detected_time = EXCLUDED.detected_time,
        category = EXCLUDED.category,
        severity = EXCLUDED.severity,
        confidence = EXCLUDED.confidence,
        geocode_confidence = EXCLUDED.geocode_confidence,
        raw_payload = EXCLUDED.raw_payload,
        normalized_payload = EXCLUDED.normalized_payload,
        processed_at = NOW(),
        updated_at = NOW()
       RETURNING *`,
      [
        reportId,
        report.sourceId,
        report.externalId,
        report.sourceName,
        report.title,
        report.description,
        report.url ?? null,
        report.country ?? null,
        report.region ?? null,
        report.placeName ?? null,
        latitude,
        longitude,
        report.eventTime,
        report.detectedTime,
        report.category,
        report.severity,
        report.confidence,
        report.geocodeConfidence,
        JSON.stringify(report.rawPayload ?? {}),
        JSON.stringify(report.normalizedPayload)
      ]
    );

    const rawReport = mapRawReportRow(rawResult.rows[0]);
    const cluster = await findCluster(client, report, latitude, longitude);
    const result = cluster
      ? await updateCluster(client, cluster, rawReport, report, latitude, longitude)
      : await createEventFromReport(client, rawReport, report, latitude, longitude);

    await client.query(
      `UPDATE raw_sources
       SET last_ingested_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [report.sourceId]
    );

    return result;
  });
}

async function findCluster(
  client: PoolClient,
  report: NormalizedReport,
  latitude: number,
  longitude: number
) {
  const result = await client.query<EventRow>(
    `WITH candidate AS (
       SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY AS geom
     )
     SELECT events.*, ST_Distance(events.geom, candidate.geom) AS distance_m
     FROM events, candidate
     WHERE
       status NOT IN ('rejected', 'archived')
       AND category = $3
       AND event_time BETWEEN ($4::TIMESTAMPTZ - INTERVAL '48 hours')
         AND ($4::TIMESTAMPTZ + INTERVAL '48 hours')
       AND (
         ST_DWithin(events.geom, candidate.geom, 75000)
         OR (
           LOWER(COALESCE(country, '')) = LOWER(COALESCE($5, ''))
           AND LOWER(COALESCE(place_name, '')) = LOWER(COALESCE($6, ''))
         )
         OR similarity(title, $7) > 0.2
       )
     ORDER BY
       ST_Distance(events.geom, candidate.geom) ASC,
       ABS(EXTRACT(EPOCH FROM (event_time - $4::TIMESTAMPTZ))) ASC
     LIMIT 1`,
    [
      longitude,
      latitude,
      report.category,
      report.eventTime,
      report.country ?? "",
      report.placeName ?? "",
      report.title
    ]
  );

  return result.rows[0];
}

async function createEventFromReport(
  client: PoolClient,
  rawReport: RawReport,
  report: NormalizedReport,
  latitude: number,
  longitude: number
): Promise<StoredReportResult> {
  const eventId = `evt-${hashString(`${report.sourceId}:${report.externalId}`)}`;
  const eventShape = {
    category: report.category,
    severity: report.severity,
    locationName: formatLocation(report),
    latitude,
    longitude
  };
  const nearbyInfrastructure = await findNearbyInfrastructureForClient(
    client,
    latitude,
    longitude,
    50
  );
  const civilImpact = createCivilImpactAnalysis(
    eventShape,
    nearbyInfrastructure
  );

  await client.query(
    `INSERT INTO events
      (
        id,
        title,
        description,
        category,
        severity,
        confidence,
        country,
        region,
        place_name,
        location_name,
        latitude,
        longitude,
        event_time,
        detected_time,
        geocode_confidence,
        civil_impact,
        source_count,
        raw_report_count,
        updated_at
      )
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16, 1, 1, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      eventId,
      report.title,
      report.description,
      report.category,
      report.severity,
      report.confidence,
      report.country ?? null,
      report.region ?? null,
      report.placeName ?? null,
      formatLocation(report),
      latitude,
      longitude,
      report.eventTime,
      report.detectedTime,
      report.geocodeConfidence,
      civilImpact
    ]
  );

  await linkReportToEvent(client, eventId, rawReport, report);
  await addImpactNote(client, eventId, civilImpact);

  return { eventId, created: true, skipped: false };
}

async function updateCluster(
  client: PoolClient,
  cluster: EventRow,
  rawReport: RawReport,
  report: NormalizedReport,
  latitude: number,
  longitude: number
): Promise<StoredReportResult> {
  const eventId = String(cluster.id);

  await linkReportToEvent(client, eventId, rawReport, report);

  const countsResult = await client.query<EventRow>(
    `SELECT
       COUNT(*)::INTEGER AS raw_report_count,
       COUNT(DISTINCT COALESCE(NULLIF(source_name, ''), source_id))::INTEGER AS source_count
     FROM event_sources
     WHERE event_id = $1`,
    [eventId]
  );
  const rawReportCount = Number(countsResult.rows[0]?.raw_report_count ?? 1);
  const sourceCount = Number(countsResult.rows[0]?.source_count ?? 1);
  const evidence = await assessEventEvidence(client, eventId);
  const confidence = Math.max(
    0.05,
    Math.min(
      0.98,
      Math.max(Number(cluster.confidence ?? 0), report.confidence) +
        Math.max(0, sourceCount - 1) * 0.065 +
        Math.min(3, Math.max(0, rawReportCount - 1)) * 0.015 +
        evidence.confidenceBonus -
        evidence.confidencePenalty
    )
  );
  const nextSeverity = Math.max(Number(cluster.severity ?? 1), report.severity);
  const title = report.severity > Number(cluster.severity ?? 1) ? report.title : String(cluster.title);
  const nearbyInfrastructure = await findNearbyInfrastructureForClient(
    client,
    latitude,
    longitude,
    50
  );
  const civilImpact = createCivilImpactAnalysis(
    {
      category: report.category,
      severity: nextSeverity as 1 | 2 | 3 | 4 | 5,
      locationName: formatLocation(report)
    },
    nearbyInfrastructure
  );

  await client.query(
    `UPDATE events
     SET
       title = $2,
       description = CASE
         WHEN LENGTH(description) >= LENGTH($3) THEN description
         ELSE $3
       END,
       severity = $4,
       confidence = $5,
       detected_time = GREATEST(detected_time, $6::TIMESTAMPTZ),
       source_count = $7,
       raw_report_count = $8,
       geocode_confidence = GREATEST(geocode_confidence, $9),
       civil_impact = $10,
       updated_at = NOW()
     WHERE id = $1`,
    [
      eventId,
      title,
      report.description,
      nextSeverity,
      Math.round(confidence * 1000) / 1000,
      report.detectedTime,
      sourceCount,
      rawReportCount,
      report.geocodeConfidence,
      civilImpact
    ]
  );

  await addImpactNote(client, eventId, civilImpact);
  await addEvidenceNote(client, eventId, evidence.noteBody);

  return { eventId, created: false, skipped: false };
}

async function linkReportToEvent(
  client: PoolClient,
  eventId: string,
  rawReport: RawReport,
  report: NormalizedReport
) {
  await client.query(
    `INSERT INTO event_sources
      (event_id, raw_report_id, source_id, source_name, url, title)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id, raw_report_id) DO UPDATE SET
      source_name = EXCLUDED.source_name,
      url = EXCLUDED.url,
      title = EXCLUDED.title`,
    [
      eventId,
      rawReport.id,
      report.sourceId,
      report.sourceName,
      report.url ?? null,
      report.title
    ]
  );

  await client.query(
    `UPDATE raw_reports
     SET event_id = $1, processed_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [eventId, rawReport.id]
  );
}

async function addImpactNote(client: PoolClient, eventId: string, body: string) {
  await client.query(
    `INSERT INTO analysis_notes (id, event_id, note_type, body, created_by)
     VALUES ($1, $2, 'impact', $3, 'rule-engine')
     ON CONFLICT (id) DO NOTHING`,
    [`note-${hashString(`${eventId}:${body}`)}`, eventId, body]
  );
}

async function addEvidenceNote(
  client: PoolClient,
  eventId: string,
  body?: string
) {
  if (!body) {
    return;
  }

  await client.query(
    `INSERT INTO analysis_notes (id, event_id, note_type, body, created_by)
     VALUES ($1, $2, 'system', $3, 'evidence-weighting')
     ON CONFLICT (id) DO NOTHING`,
    [`note-${hashString(`${eventId}:evidence:${body}`)}`, eventId, body]
  );
}

async function assessEventEvidence(
  client: PoolClient,
  eventId: string
): Promise<EvidenceAssessment> {
  const result = await client.query<EventRow>(
    `SELECT
       source_name,
       title,
       description,
       country,
       region,
       place_name,
       event_time,
       confidence,
       geocode_confidence,
       normalized_payload ->> 'sourceCountry' AS source_country,
       normalized_payload ->> 'sourceLanguage' AS source_language
     FROM raw_reports
     WHERE event_id = $1
     ORDER BY detected_time DESC
     LIMIT 40`,
    [eventId]
  );
  const reports = result.rows.map(mapEvidenceReport);

  if (reports.length < 2) {
    return {
      independentCountryCount: 0,
      contradictionDetected: false,
      confidenceBonus: 0,
      confidencePenalty: 0
    };
  }

  const sourceCountries = new Set(
    reports.map((report) => report.sourceCountry).filter(Boolean)
  );
  const denialCount = reports.filter((report) => report.denialLanguage).length;
  const contradictionDetected = denialCount > 0 && denialCount < reports.length;
  const bestSupported = reports.reduce((best, report) =>
    report.score > best.score ? report : best
  );
  const confidenceBonus = Math.min(
    0.12,
    Math.max(0, sourceCountries.size - 1) * 0.025 +
      (reports.some((report) => report.hasSpecificLocation) ? 0.02 : 0)
  );
  const confidencePenalty = contradictionDetected ? 0.1 : 0;

  return {
    independentCountryCount: sourceCountries.size,
    contradictionDetected,
    confidenceBonus,
    confidencePenalty,
    noteBody: createEvidenceNote({
      reports,
      sourceCountries,
      contradictionDetected,
      bestSupported
    })
  };
}

function mapEvidenceReport(row: EventRow): EvidenceReport {
  const title = rowString(row.title);
  const description = rowString(row.description);
  const sourceCountry = rowString(row.source_country);
  const placeName = rowString(row.place_name);
  const country = rowString(row.country);
  const region = rowString(row.region);
  const confidence = rowNumber(row.confidence);
  const geocodeConfidence = rowNumber(row.geocode_confidence);
  const hasSpecificLocation = Boolean(placeName && placeName !== country && placeName !== region);
  const denialLanguage = hasDenialLanguage(`${title} ${description}`);
  const score =
    confidence +
    geocodeConfidence * 0.2 +
    (hasSpecificLocation ? 0.08 : 0) +
    (sourceCountry ? 0.03 : 0);

  return {
    sourceName: rowString(row.source_name) || "Unknown source",
    sourceCountry,
    sourceLanguage: rowString(row.source_language),
    title,
    description,
    confidence,
    geocodeConfidence,
    hasSpecificLocation,
    denialLanguage,
    score
  };
}

function createEvidenceNote({
  reports,
  sourceCountries,
  contradictionDetected,
  bestSupported
}: {
  reports: EvidenceReport[];
  sourceCountries: Set<string>;
  contradictionDetected: boolean;
  bestSupported: EvidenceReport;
}) {
  const sourceNames = new Set(reports.map((report) => report.sourceName));
  const countrySummary =
    sourceCountries.size > 0
      ? ` aus ${sourceCountries.size} Herkunftsraeumen`
      : "";
  const languageSummary = Array.from(
    new Set(reports.map((report) => report.sourceLanguage).filter(Boolean))
  )
    .slice(0, 4)
    .join(", ");
  const parts = [
    `Quellenabgleich: ${reports.length} Rohberichte von ${sourceNames.size} Quellen${countrySummary}.`
  ];

  if (languageSummary) {
    parts.push(`Sprachen: ${languageSummary}.`);
  }

  if (contradictionDetected) {
    parts.push(
      "Widerspruch oder Bestreitung erkannt; die Confidence wurde gebremst, bis mehr unabhaengige Uebereinstimmung vorliegt."
    );
  } else {
    parts.push(
      "Keine direkte Bestreitung im Cluster erkannt; mehrere unabhaengige Quellen erhoehen die Confidence."
    );
  }

  parts.push(
    `Aktuell am staerksten gewichtet: ${bestSupported.sourceName} - "${truncateText(
      bestSupported.title,
      130
    )}" wegen Orts-/Zeitangaben, Geocode-Confidence und Bericht-Confidence.`
  );

  return parts.join(" ");
}

function hasDenialLanguage(text: string) {
  return /(denies|denied|rejects|refutes|false|fake|not confirmed|unconfirmed|no evidence|опроверг|отрица|не подтверж|фейк|否认|駁斥|驳斥|不实|未证实|沒有證據|没有证据)/i.test(
    text
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function rowString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return "";
}

function rowNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

async function getSourcesForEvents(eventIds: string[]) {
  const sourceMap = new Map<string, ReturnType<typeof mapSourceRow>[]>();

  if (eventIds.length === 0) {
    return sourceMap;
  }

  const result = await query<EventRow>(
    `SELECT
       event_sources.event_id,
       event_sources.raw_report_id,
       event_sources.source_id,
       event_sources.source_name,
       event_sources.url,
       event_sources.title,
       raw_reports.normalized_payload ->> 'sourceCountry' AS source_country,
       raw_reports.normalized_payload ->> 'sourceLanguage' AS source_language
     FROM event_sources
     LEFT JOIN raw_reports ON raw_reports.id = event_sources.raw_report_id
     WHERE event_sources.event_id = ANY($1::TEXT[])
     ORDER BY event_sources.created_at DESC`,
    [eventIds]
  );

  for (const row of result.rows) {
    const eventId = String(row.event_id);
    const sources = sourceMap.get(eventId) ?? [];
    sources.push(mapSourceRow(row));
    sourceMap.set(eventId, sources);
  }

  return sourceMap;
}

async function findNearbyInfrastructureForClient(
  client: PoolClient,
  latitude: number,
  longitude: number,
  radiusKm: number
) {
  const result = await client.query<EventRow>(
    `SELECT *
     FROM infrastructure
     WHERE ST_DWithin(
       geom,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
       $3
     )
     ORDER BY ST_Distance(
       geom,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
     )
     LIMIT 10`,
    [longitude, latitude, radiusKm * 1000]
  );

  return result.rows.map(mapInfrastructureRow);
}

function formatLocation(report: NormalizedReport) {
  return [report.placeName, report.region, report.country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ") || "Unbekannter Ort";
}

function inferCountry(name: string) {
  const lookup: Record<string, string> = {
    Main: "Germany",
    Innenstadt: "Germany",
    Manhattan: "United States",
    Harbor: "United Arab Emirates",
    Central: "United Kingdom",
    East: "Australia",
    Koto: "Japan",
    Coastal: "Brazil",
    Paris: "France",
    Shanghai: "China"
  };
  const first = name.split(" ")[0];

  return lookup[first] ?? null;
}

function optionalString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ? String(value) : undefined;
}

function optionalNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

const lifecycleCategories: EventCategory[] = [
  "power",
  "oil",
  "hospital",
  "bridge",
  "rail",
  "water",
  "communication",
  "earthquake",
  "disaster",
  "protest",
  "conflict",
  "health",
  "incident",
  "unverified"
];

function retentionIntervalSql() {
  const cases = lifecycleCategories
    .map(
      (category) =>
        `WHEN '${category}' THEN INTERVAL '${getEventRetentionHours(category, 1)} hours'`
    )
    .join("\n         ");

  return `(
       CASE category
         ${cases}
         ELSE INTERVAL '72 hours'
       END + GREATEST(severity - 1, 0) * INTERVAL '12 hours'
     )`;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
