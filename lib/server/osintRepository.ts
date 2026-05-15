import type { PoolClient } from "pg";
import { localInfrastructure } from "@/data/localInfrastructure";
import { osintSources } from "@/data/osintSources";
import { createCivilImpactAnalysis } from "@/lib/osint/impact";
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
  skipped: number;
};

type StoredReportResult = {
  eventId?: string;
  created: boolean;
  skipped: boolean;
};

type EventRow = Record<string, unknown>;

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
    skipped: 0
  };

  for (const report of reports) {
    const result = await storeNormalizedReport(report);
    stats.rawReports += result.skipped ? 0 : 1;
    stats.skipped += result.skipped ? 1 : 0;
    stats.eventsCreated += result.created ? 1 : 0;
    stats.eventsUpdated += !result.created && !result.skipped ? 1 : 0;
  }

  return stats;
}

export async function listEvents(
  filters: Partial<EventFilters> = {},
  options: { includeRejected?: boolean } = {}
) {
  const where: string[] = [options.includeRejected ? "TRUE" : "status <> 'rejected'"];
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

export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  const eventResult = await query<EventRow>("SELECT * FROM events WHERE id = $1", [eventId]);
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
  const where: string[] = ["status <> 'rejected'"];
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
    return getEventDetail(eventId);
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

  return getEventDetail(eventId);
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
       status <> 'rejected'
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
  const confidence = Math.min(
    0.98,
    Math.max(Number(cluster.confidence ?? 0), report.confidence) +
      Math.max(0, sourceCount - 1) * 0.08 +
      Math.min(3, Math.max(0, rawReportCount - 1)) * 0.02
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

async function getSourcesForEvents(eventIds: string[]) {
  const sourceMap = new Map<string, ReturnType<typeof mapSourceRow>[]>();

  if (eventIds.length === 0) {
    return sourceMap;
  }

  const result = await query<EventRow>(
    `SELECT event_id, raw_report_id, source_id, source_name, url, title
     FROM event_sources
     WHERE event_id = ANY($1::TEXT[])
     ORDER BY created_at DESC`,
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

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
