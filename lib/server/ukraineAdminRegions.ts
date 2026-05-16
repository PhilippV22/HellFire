import { readFile } from "fs/promises";
import path from "path";
import type { ConflictAdminRegionOverlay, GeoPoint } from "@/types/conflictOverlay";
import type { CrisisEvent } from "@/types/events";

type UkraineOblastFeatureCollection = {
  type: "FeatureCollection";
  features: UkraineOblastFeature[];
};

type UkraineOblastFeature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    nameUk?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type RegionOccupationEstimate = {
  name: string;
  occupationPercent: number;
  confidence: number;
};

let oblastCache: UkraineOblastFeatureCollection | null = null;

const majorityOccupiedRegions: RegionOccupationEstimate[] = [
  { name: "Autonomous Republic of Crimea", occupationPercent: 100, confidence: 0.9 },
  { name: "Luhansk Oblast", occupationPercent: 99.6, confidence: 0.84 },
  { name: "Donetsk Oblast", occupationPercent: 78.1, confidence: 0.8 },
  { name: "Zaporizhia Oblast", occupationPercent: 74.8, confidence: 0.78 },
  { name: "Kherson Oblast", occupationPercent: 72, confidence: 0.78 }
];

const regionAliases = new Map<string, string>([
  ["crimea", "Autonomous Republic of Crimea"],
  ["autonomous republic of crimea", "Autonomous Republic of Crimea"],
  ["luhansk", "Luhansk Oblast"],
  ["luhansk oblast", "Luhansk Oblast"],
  ["donetsk", "Donetsk Oblast"],
  ["donetsk oblast", "Donetsk Oblast"],
  ["zaporizhzhia", "Zaporizhia Oblast"],
  ["zaporizhia", "Zaporizhia Oblast"],
  ["zaporizhzhia oblast", "Zaporizhia Oblast"],
  ["zaporizhia oblast", "Zaporizhia Oblast"],
  ["kherson", "Kherson Oblast"],
  ["kherson oblast", "Kherson Oblast"],
  ["kharkiv", "Kharkiv Oblast"],
  ["kharkiv oblast", "Kharkiv Oblast"],
  ["sumy", "Sumy Oblast"],
  ["sumy oblast", "Sumy Oblast"],
  ["dnipro", "Dnipropetrovsk Oblast"],
  ["dnipropetrovsk", "Dnipropetrovsk Oblast"],
  ["dnipropetrovsk oblast", "Dnipropetrovsk Oblast"],
  ["kryvyi rih", "Dnipropetrovsk Oblast"],
  ["nikopol", "Dnipropetrovsk Oblast"],
  ["kupiansk", "Kharkiv Oblast"],
  ["poltava", "Poltava Oblast"],
  ["poltava oblast", "Poltava Oblast"],
  ["kramatorsk", "Donetsk Oblast"],
  ["sloviansk", "Donetsk Oblast"],
  ["toretsk", "Donetsk Oblast"],
  ["chasiv yar", "Donetsk Oblast"],
  ["bakhmut", "Donetsk Oblast"],
  ["avdiivka", "Donetsk Oblast"],
  ["mariupol", "Donetsk Oblast"],
  ["melitopol", "Zaporizhia Oblast"],
  ["berdyansk", "Zaporizhia Oblast"],
  ["odesa", "Odessa Oblast"],
  ["odessa", "Odessa Oblast"],
  ["odessa oblast", "Odessa Oblast"],
  ["mykolaiv", "Mykolaiv Oblast"],
  ["mykolaiv oblast", "Mykolaiv Oblast"],
  ["kyiv", "Kiev Oblast"],
  ["kiev", "Kiev Oblast"],
  ["kyiv oblast", "Kiev Oblast"],
  ["kiev oblast", "Kiev Oblast"]
]);

export async function getUkraineConflictAdminRegions(events: CrisisEvent[]) {
  const featureCollection = await loadUkraineOblasts();
  const featureMap = createFeatureMap(featureCollection.features);
  const occupied = createOccupiedRegionOverlays(featureMap);
  const affected = createAffectedRegionOverlays(events, featureMap, occupied);

  return [...occupied, ...affected].sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      (b.occupationPercent ?? 0) - (a.occupationPercent ?? 0) ||
      b.eventCount - a.eventCount
  );
}

async function loadUkraineOblasts() {
  if (oblastCache) {
    return oblastCache;
  }

  const file = await readFile(
    path.join(process.cwd(), "public/geodata/ukraine-oblasts.geo.json"),
    "utf8"
  );
  oblastCache = JSON.parse(file) as UkraineOblastFeatureCollection;

  return oblastCache;
}

function createFeatureMap(features: UkraineOblastFeature[]) {
  const map = new Map<string, UkraineOblastFeature>();

  for (const feature of features) {
    map.set(normalizeRegion(feature.properties.name), feature);
  }

  return map;
}

function createOccupiedRegionOverlays(
  featureMap: Map<string, UkraineOblastFeature>
): ConflictAdminRegionOverlay[] {
  return majorityOccupiedRegions
    .map<ConflictAdminRegionOverlay | null>((estimate) => {
      const feature = featureMap.get(normalizeRegion(estimate.name));

      if (!feature) {
        return null;
      }

      return {
        id: `ua-region-occupied-${normalizeRegion(estimate.name).replaceAll(" ", "-")}`,
        name: estimate.name,
        country: "Ukraine",
        status: "occupied-majority" as const,
        rings: extractFeatureRings(feature),
        occupationPercent: estimate.occupationPercent,
        eventCount: 0,
        confidence: estimate.confidence,
        updatedAt: "2026-01-01T00:00:00.000Z",
        source:
          "DeepState year-end regional occupation estimates reported by Ukrainska Pravda/Euromaidan Press; rendered as regional civil context.",
        description:
          `Mehrheitsbesetzt geschaetzt (${estimate.occupationPercent}%). ` +
          "Regionale Kontextflaeche, keine Frontlinie und kein Truppen-Tracking."
      };
    })
    .filter((overlay): overlay is ConflictAdminRegionOverlay => overlay !== null);
}

function createAffectedRegionOverlays(
  events: CrisisEvent[],
  featureMap: Map<string, UkraineOblastFeature>,
  occupied: ConflictAdminRegionOverlay[]
): ConflictAdminRegionOverlay[] {
  const occupiedNames = new Set(occupied.map((region) => normalizeRegion(region.name)));
  const grouped = new Map<string, CrisisEvent[]>();

  for (const event of events) {
    const regionName = eventToUkraineRegion(event);

    if (!regionName || occupiedNames.has(normalizeRegion(regionName))) {
      continue;
    }

    const group = grouped.get(regionName) ?? [];
    group.push(event);
    grouped.set(regionName, group);
  }

  return Array.from(grouped.entries())
    .map<ConflictAdminRegionOverlay | null>(([regionName, regionEvents]) => {
      const feature = featureMap.get(normalizeRegion(regionName));

      if (!feature) {
        return null;
      }

      const confidence =
        regionEvents.reduce((total, event) => total + event.confidence, 0) /
        regionEvents.length;
      const updatedAt = regionEvents
        .map((event) => event.detectedTime || event.eventTime)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

      return {
        id: `ua-region-affected-${normalizeRegion(regionName).replaceAll(" ", "-")}`,
        name: regionName,
        country: "Ukraine",
        status: "conflict-affected" as const,
        rings: extractFeatureRings(feature),
        eventCount: regionEvents.length,
        confidence: Math.round(Math.min(0.84, confidence) * 100) / 100,
        updatedAt: updatedAt || new Date().toISOString(),
        source: "Aktuelle oeffentliche Konfliktmeldungen im HellFire-Live-Feed",
        description:
          "Region mit aktuellen geocodierten Konfliktmeldungen. Flaeche zeigt Verwaltungsregion, nicht taktische Kontrolle."
      };
    })
    .filter((overlay): overlay is ConflictAdminRegionOverlay => overlay !== null)
    .filter((overlay) => overlay.eventCount > 0 && overlay.confidence >= 0.25);
}

function eventToUkraineRegion(event: CrisisEvent) {
  if (event.country !== "Ukraine") {
    return "";
  }

  const candidates = [
    event.region,
    event.placeName,
    event.locationName,
    event.title,
    event.description
  ];

  for (const candidate of candidates) {
    const region = normalizeCandidateRegion(candidate);

    if (region) {
      return region;
    }
  }

  return "";
}

function normalizeCandidateRegion(value?: string) {
  const normalized = normalizeRegion(value);

  if (!normalized) {
    return "";
  }

  if (regionAliases.has(normalized)) {
    return regionAliases.get(normalized) ?? "";
  }

  for (const [alias, region] of regionAliases.entries()) {
    if (normalized.includes(alias)) {
      return region;
    }
  }

  return "";
}

function extractFeatureRings(feature: UkraineOblastFeature): GeoPoint[][] {
  if (feature.geometry.type === "Polygon") {
    const polygon = feature.geometry.coordinates as number[][][];

    return polygon.length > 0 ? [toGeoPoints(polygon[0])] : [];
  }

  return (feature.geometry.coordinates as number[][][][])
    .map((polygon) => polygon[0])
    .filter(Boolean)
    .map(toGeoPoints);
}

function toGeoPoints(ring: number[][]): GeoPoint[] {
  return ring
    .map(([longitude, latitude]) => ({ latitude, longitude }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
}

function normalizeRegion(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(oblast|region|province)\b/g, "oblast")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function statusRank(status: ConflictAdminRegionOverlay["status"]) {
  return status === "occupied-majority" ? 0 : 1;
}
