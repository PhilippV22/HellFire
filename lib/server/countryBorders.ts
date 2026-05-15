import { readFile } from "fs/promises";
import path from "path";
import type { ConflictBorderLine, GeoPoint } from "@/types/conflictOverlay";

type WorldFeatureCollection = {
  type: "FeatureCollection";
  features: WorldFeature[];
};

type WorldFeature = {
  type: "Feature";
  properties: {
    name: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

let countryCache: WorldFeatureCollection | null = null;

const countryNameAliases = new Map<string, string[]>([
  ["palestinian territories", ["West Bank"]],
  ["palestine", ["West Bank"]],
  ["united states", ["United States of America"]],
  ["usa", ["United States of America"]],
  ["us", ["United States of America"]],
  ["tanzania", ["United Republic of Tanzania"]],
  ["democratic congo", ["Democratic Republic of the Congo"]],
  ["dr congo", ["Democratic Republic of the Congo"]],
  ["republic of congo", ["Republic of the Congo"]],
  ["congo", ["Republic of the Congo", "Democratic Republic of the Congo"]],
  ["south korea", ["South Korea"]],
  ["north korea", ["North Korea"]],
  ["myanmar", ["Myanmar"]],
  ["burma", ["Myanmar"]]
]);

export async function getConflictCountryBorders(
  countries: Array<{ country: string; intensity: number }>
): Promise<ConflictBorderLine[]> {
  const featureCollection = await loadCountryFeatures();
  const featureMap = createFeatureMap(featureCollection.features);
  const lines: ConflictBorderLine[] = [];

  for (const country of countries) {
    const features = getFeatureCandidates(country.country, featureMap);
    const rings = features.flatMap((feature) =>
      extractFeatureRings(feature).flatMap((ring) => splitRingAtDateLine(ring))
    );

    if (rings.length === 0) {
      continue;
    }

    lines.push({
      country: country.country,
      rings,
      intensity: country.intensity
    });
  }

  return lines;
}

async function loadCountryFeatures() {
  if (countryCache) {
    return countryCache;
  }

  const file = await readFile(
    path.join(process.cwd(), "public/geodata/countries.geo.json"),
    "utf8"
  );
  countryCache = JSON.parse(file) as WorldFeatureCollection;

  return countryCache;
}

function createFeatureMap(features: WorldFeature[]) {
  const map = new Map<string, WorldFeature[]>();

  for (const feature of features) {
    const key = normalizeCountry(feature.properties.name);
    const existing = map.get(key) ?? [];
    existing.push(feature);
    map.set(key, existing);
  }

  return map;
}

function getFeatureCandidates(
  country: string,
  featureMap: Map<string, WorldFeature[]>
) {
  const names = [country, ...(countryNameAliases.get(normalizeCountry(country)) ?? [])];
  const features: WorldFeature[] = [];

  for (const name of names) {
    features.push(...(featureMap.get(normalizeCountry(name)) ?? []));
  }

  return features;
}

function extractFeatureRings(feature: WorldFeature): GeoPoint[][] {
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

function normalizeCountry(country: string) {
  return country
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(the|republic of|state of)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
