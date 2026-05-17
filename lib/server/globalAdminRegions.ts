import { readFile } from "fs/promises";
import path from "path";
import { getUkraineConflictAdminRegions } from "@/lib/server/ukraineAdminRegions";
import type {
  ConflictAdminRegionOverlay,
  ConflictAdminRegionStatus,
  GeoPoint
} from "@/types/conflictOverlay";
import type { CrisisEvent } from "@/types/events";

type AdminRegionFeatureCollection = {
  type: "FeatureCollection";
  features: AdminRegionFeature[];
};

type AdminRegionFeature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    localName?: string;
    country: string;
    isoA2?: string;
    adm0A3?: string;
    type?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type RegionEvidence = {
  events: CrisisEvent[];
  occupiedSignalCount: number;
  maxSeverity: number;
};

type RegionLookup = {
  byCountry: Map<string, AdminRegionFeature[]>;
};

let adminRegionCache: AdminRegionFeatureCollection | null = null;
let lookupCache: RegionLookup | null = null;

const countryAliases = new Map<string, string[]>([
  ["democratic republic of the congo", ["Democratic Republic of the Congo"]],
  ["dr congo", ["Democratic Republic of the Congo"]],
  ["drc", ["Democratic Republic of the Congo"]],
  ["palestinian territories", ["Gaza Strip", "West Bank"]],
  ["palestine", ["Gaza Strip", "West Bank"]],
  ["russia", ["Russia"]],
  ["russian federation", ["Russia"]],
  ["south sudan", ["S. Sudan"]],
  ["sudan", ["Sudan"]],
  ["syria", ["Syria"]],
  ["turkiye", ["Turkey"]],
  ["turkey", ["Turkey"]],
  ["united states", ["United States of America"]],
  ["usa", ["United States of America"]],
  ["us", ["United States of America"]]
]);

const groundContactPattern =
  /\b(armed clash(?:es)?|battle(?:s)?|combat|fighters?|fighting|firefight|ground assault|ground combat|ground fighting|incursion|militant(?:s)?|militia|overran|raid(?:ed|s)?|seized|street fighting|troop(?:s)? clashed|warrior|bodenkampf|bodenkontakt|gefecht(?:e)?|kämpf(?:e|en)|kampfhandlungen|захват|боестолкнов|бой|бои|наступ|оккупац|окупац|штурм|військ|бої|наступ|окупац|地面战|地面戰|交火|武装冲突|武裝衝突)\b/i;

const occupationControlPattern =
  /\b(captured|control(?:led|s)?|fell to|occupied|occupation|overran|seized|taken over|under .* control|besetzt|eingenommen|kontrolliert|unter .* kontrolle|захват|занял|оккупац|окупац|контрол|占领|佔領|控制)\b/i;

export async function getGlobalConflictAdminRegions(events: CrisisEvent[]) {
  const groundContactEvents = events.filter(isGroundContactConflictEvent);
  const [ukraineRegions, featureCollection] = await Promise.all([
    getUkraineConflictAdminRegions(groundContactEvents),
    loadAdminRegions()
  ]);
  const lookup = getRegionLookup(featureCollection);
  const globalRegions = createGlobalAffectedRegionOverlays(
    groundContactEvents.filter((event) => normalizeCountry(event.country) !== "ukraine"),
    lookup
  );

  return [...ukraineRegions, ...globalRegions]
    .sort(
      (a, b) =>
        statusRank(a.status) - statusRank(b.status) ||
        b.eventCount - a.eventCount ||
        b.confidence - a.confidence
    )
    .slice(0, 160);
}

function createGlobalAffectedRegionOverlays(
  events: CrisisEvent[],
  lookup: RegionLookup
): ConflictAdminRegionOverlay[] {
  const grouped = new Map<string, RegionEvidence>();

  for (const event of events) {
    const feature = findRegionForEvent(event, lookup);

    if (!feature) {
      continue;
    }

    const key = featureKey(feature);
    const evidence = grouped.get(key) ?? {
      events: [],
      occupiedSignalCount: 0,
      maxSeverity: 1
    };

    evidence.events.push(event);
    evidence.maxSeverity = Math.max(evidence.maxSeverity, event.severity);

    if (hasOccupationControlSignal(event)) {
      evidence.occupiedSignalCount += 1;
    }

    grouped.set(key, evidence);
  }

  return Array.from(grouped.entries())
    .map<ConflictAdminRegionOverlay | null>(([key, evidence]) => {
      const feature = findFeatureByKey(key, lookup);

      if (!feature || evidence.events.length === 0) {
        return null;
      }

      const confidence = roundConfidence(
        Math.min(
          0.86,
          evidence.events.reduce((total, event) => total + event.confidence, 0) /
            evidence.events.length
        )
      );
      const status = inferRegionStatus(evidence);
      const updatedAt =
        evidence.events
          .map((event) => event.detectedTime || event.eventTime)
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ||
        new Date().toISOString();

      return {
        id: `global-admin-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
        name: feature.properties.name,
        country: feature.properties.country,
        status,
        rings: extractFeatureRings(feature),
        occupationPercent: status === "occupied-majority" ? 51 : undefined,
        eventCount: evidence.events.length,
        confidence,
        updatedAt,
        source: "Oeffentliche HellFire-Konfliktmeldungen mit Bodenkontakt-Signalen",
        description:
          status === "occupied-majority"
            ? "Verwaltungsregion mit oeffentlichen Kontroll-/Besetzungsformulierungen. Schwellenklasse, keine taktische Frontlinie."
            : "Verwaltungsregion mit oeffentlichen Bodenkampf-/Bodenkontaktmeldungen. Flaeche zeigt zivilen Lagekontext, keine Truppenposition."
      };
    })
    .filter((overlay): overlay is ConflictAdminRegionOverlay => overlay !== null)
    .filter((overlay) => overlay.rings.length > 0 && overlay.confidence >= 0.25);
}

function inferRegionStatus(evidence: RegionEvidence): ConflictAdminRegionStatus {
  if (
    evidence.occupiedSignalCount >= 2 ||
    (evidence.occupiedSignalCount >= 1 && evidence.maxSeverity >= 4)
  ) {
    return "occupied-majority";
  }

  return "conflict-affected";
}

async function loadAdminRegions() {
  if (adminRegionCache) {
    return adminRegionCache;
  }

  const file = await readFile(
    path.join(process.cwd(), "public/geodata/admin1-regions.geo.json"),
    "utf8"
  );
  adminRegionCache = JSON.parse(file) as AdminRegionFeatureCollection;

  return adminRegionCache;
}

function getRegionLookup(featureCollection: AdminRegionFeatureCollection) {
  if (lookupCache) {
    return lookupCache;
  }

  const byCountry = new Map<string, AdminRegionFeature[]>();

  for (const feature of featureCollection.features) {
    const key = normalizeCountry(feature.properties.country);
    const bucket = byCountry.get(key) ?? [];
    bucket.push(feature);
    byCountry.set(key, bucket);
  }

  lookupCache = { byCountry };

  return lookupCache;
}

function findRegionForEvent(
  event: CrisisEvent,
  lookup: RegionLookup
): AdminRegionFeature | null {
  const candidates = getCountryFeatureCandidates(event.country, lookup);

  if (candidates.length === 0) {
    return null;
  }

  return (
    findRegionByName(event, candidates) ??
    findRegionContainingPoint(event, candidates) ??
    findNearestRegion(event, candidates)
  );
}

function findRegionByName(
  event: CrisisEvent,
  features: AdminRegionFeature[]
) {
  const text = normalizeRegion(
    [event.region, event.placeName, event.locationName, event.title].filter(Boolean).join(" ")
  );

  if (!text) {
    return null;
  }

  return (
    features.find((feature) => text.includes(normalizeRegion(feature.properties.name))) ??
    null
  );
}

function findRegionContainingPoint(
  event: CrisisEvent,
  features: AdminRegionFeature[]
) {
  if (!hasUsableCoordinates(event)) {
    return null;
  }

  return (
    features.find((feature) =>
      featureContainsPoint(feature, event.longitude, event.latitude)
    ) ?? null
  );
}

function findNearestRegion(
  event: CrisisEvent,
  features: AdminRegionFeature[]
) {
  if (!hasUsableCoordinates(event) || (event.geocodeConfidence ?? 0) < 0.45) {
    return null;
  }

  let nearest: AdminRegionFeature | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const feature of features) {
    const center = getFeatureCenter(feature);
    const distance =
      Math.abs(center.latitude - event.latitude) +
      Math.abs(center.longitude - event.longitude);

    if (distance < nearestDistance) {
      nearest = feature;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= 5 ? nearest : null;
}

function getCountryFeatureCandidates(
  country: string | undefined,
  lookup: RegionLookup
) {
  const normalized = normalizeCountry(country);
  const names = [country ?? "", ...(countryAliases.get(normalized) ?? [])];
  const features: AdminRegionFeature[] = [];

  for (const name of names) {
    features.push(...(lookup.byCountry.get(normalizeCountry(name)) ?? []));
  }

  return dedupeFeatures(features);
}

function dedupeFeatures(features: AdminRegionFeature[]) {
  const seen = new Set<string>();
  const unique: AdminRegionFeature[] = [];

  for (const feature of features) {
    const key = featureKey(feature);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(feature);
  }

  return unique;
}

function featureContainsPoint(
  feature: AdminRegionFeature,
  longitude: number,
  latitude: number
) {
  return getFeatureOuterRings(feature).some((ring) =>
    pointInRing(longitude, latitude, ring)
  );
}

function pointInRing(longitude: number, latitude: number, ring: number[][]) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude || 1e-12) +
          currentLongitude;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getFeatureCenter(feature: AdminRegionFeature) {
  const points = getFeatureOuterRings(feature).flat();
  const totals = points.reduce(
    (accumulator, [longitude, latitude]) => ({
      latitude: accumulator.latitude + latitude,
      longitude: accumulator.longitude + longitude
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / Math.max(points.length, 1),
    longitude: totals.longitude / Math.max(points.length, 1)
  };
}

function extractFeatureRings(feature: AdminRegionFeature): GeoPoint[][] {
  return getFeatureOuterRings(feature)
    .map(toGeoPoints)
    .flatMap(splitRingAtDateLine);
}

function getFeatureOuterRings(feature: AdminRegionFeature): number[][][] {
  if (feature.geometry.type === "Polygon") {
    const polygon = feature.geometry.coordinates as number[][][];

    return polygon.length > 0 ? [polygon[0]] : [];
  }

  return (feature.geometry.coordinates as number[][][][])
    .map((polygon) => polygon[0])
    .filter(Boolean);
}

function toGeoPoints(ring: number[][]): GeoPoint[] {
  return ring
    .map(([longitude, latitude]) => ({ latitude, longitude }))
    .filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    );
}

function splitRingAtDateLine(ring: GeoPoint[]) {
  const segments: GeoPoint[][] = [];
  let segment: GeoPoint[] = [];

  for (const point of ring) {
    const previous = segment.at(-1);

    if (previous && Math.abs(point.longitude - previous.longitude) > 180) {
      if (segment.length > 2) {
        segments.push(segment);
      }

      segment = [point];
      continue;
    }

    segment.push(point);
  }

  if (segment.length > 2) {
    segments.push(segment);
  }

  return segments;
}

function isGroundContactConflictEvent(event: CrisisEvent) {
  if (event.category !== "conflict") {
    return false;
  }

  return groundContactPattern.test(eventText(event)) || hasOccupationControlSignal(event);
}

function hasOccupationControlSignal(event: CrisisEvent) {
  return occupationControlPattern.test(eventText(event));
}

function eventText(event: CrisisEvent) {
  return [
    event.title,
    event.description,
    event.locationName,
    event.region,
    event.placeName,
    event.civilImpact,
    ...event.sources.map((source) => source.note)
  ]
    .filter(Boolean)
    .join(" ");
}

function hasUsableCoordinates(event: CrisisEvent) {
  return (
    Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude) &&
    Math.abs(event.latitude) <= 90 &&
    Math.abs(event.longitude) <= 180 &&
    event.locationPrecision !== "country"
  );
}

function findFeatureByKey(key: string, lookup: RegionLookup) {
  for (const features of lookup.byCountry.values()) {
    const feature = features.find((candidate) => featureKey(candidate) === key);

    if (feature) {
      return feature;
    }
  }

  return null;
}

function featureKey(feature: AdminRegionFeature) {
  return `${feature.properties.adm0A3 || feature.properties.country}:${feature.properties.id}`;
}

function normalizeCountry(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(the|republic of|state of)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeRegion(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(oblast|region|province|governorate|state|district|county|prefecture)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roundConfidence(value: number) {
  return Math.round(value * 100) / 100;
}

function statusRank(status: ConflictAdminRegionOverlay["status"]) {
  return status === "occupied-majority" ? 0 : 1;
}
