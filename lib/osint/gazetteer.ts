export type GazetteerHit = {
  country: string;
  region?: string;
  placeName: string;
  latitude: number;
  longitude: number;
  confidence: number;
};

const gazetteer: GazetteerHit[] = [
  { country: "Germany", region: "Berlin", placeName: "Berlin", latitude: 52.52, longitude: 13.405, confidence: 0.82 },
  { country: "Germany", region: "Hessen", placeName: "Frankfurt am Main", latitude: 50.1109, longitude: 8.6821, confidence: 0.82 },
  { country: "Ukraine", region: "Kyiv", placeName: "Kyiv", latitude: 50.4501, longitude: 30.5234, confidence: 0.78 },
  { country: "Kenya", region: "Kisumu", placeName: "Kisumu", latitude: -0.0917, longitude: 34.768, confidence: 0.78 },
  { country: "Haiti", region: "Ouest", placeName: "Port-au-Prince", latitude: 18.5944, longitude: -72.3074, confidence: 0.78 },
  { country: "Bangladesh", region: "Dhaka", placeName: "Dhaka", latitude: 23.8103, longitude: 90.4125, confidence: 0.78 },
  { country: "Japan", region: "Miyagi", placeName: "Ishinomaki", latitude: 38.4345, longitude: 141.3029, confidence: 0.72 },
  { country: "Chile", region: "Valparaiso", placeName: "Valparaiso", latitude: -33.0472, longitude: -71.6127, confidence: 0.72 },
  { country: "United States", region: "New York", placeName: "New York City", latitude: 40.7128, longitude: -74.006, confidence: 0.72 },
  { country: "France", region: "Ile-de-France", placeName: "Paris", latitude: 48.8566, longitude: 2.3522, confidence: 0.72 },
  { country: "United Kingdom", region: "England", placeName: "London", latitude: 51.5072, longitude: -0.1276, confidence: 0.72 },
  { country: "Brazil", region: "Rio de Janeiro", placeName: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729, confidence: 0.72 },
  { country: "Australia", region: "New South Wales", placeName: "Sydney", latitude: -33.8688, longitude: 151.2093, confidence: 0.72 },
  { country: "China", region: "Shanghai", placeName: "Shanghai", latitude: 31.2304, longitude: 121.4737, confidence: 0.72 },
  { country: "United Arab Emirates", region: "Dubai", placeName: "Dubai", latitude: 25.2048, longitude: 55.2708, confidence: 0.72 }
];

const countryFallbacks: GazetteerHit[] = [
  { country: "Germany", placeName: "Germany", latitude: 51.1657, longitude: 10.4515, confidence: 0.48 },
  { country: "Ukraine", placeName: "Ukraine", latitude: 48.3794, longitude: 31.1656, confidence: 0.45 },
  { country: "Kenya", placeName: "Kenya", latitude: 0.0236, longitude: 37.9062, confidence: 0.45 },
  { country: "Haiti", placeName: "Haiti", latitude: 18.9712, longitude: -72.2852, confidence: 0.45 },
  { country: "Bangladesh", placeName: "Bangladesh", latitude: 23.685, longitude: 90.3563, confidence: 0.45 },
  { country: "Japan", placeName: "Japan", latitude: 36.2048, longitude: 138.2529, confidence: 0.42 },
  { country: "Chile", placeName: "Chile", latitude: -35.6751, longitude: -71.543, confidence: 0.42 },
  { country: "United States", placeName: "United States", latitude: 39.8283, longitude: -98.5795, confidence: 0.38 }
];

export function resolveLocation(input: {
  country?: string;
  region?: string;
  placeName?: string;
  latitude?: number | null;
  longitude?: number | null;
}): GazetteerHit | null {
  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    return {
      country: input.country || "Unknown",
      region: input.region,
      placeName: input.placeName || input.region || input.country || "Unbekannter Ort",
      latitude: input.latitude,
      longitude: input.longitude,
      confidence: 1
    };
  }

  const normalizedPlace = normalize(input.placeName);
  const normalizedRegion = normalize(input.region);
  const normalizedCountry = normalize(input.country);
  const placeHit = gazetteer.find((hit) => {
    return (
      (normalizedPlace && normalize(hit.placeName).includes(normalizedPlace)) ||
      (normalizedRegion && normalize(hit.region).includes(normalizedRegion))
    );
  });

  if (placeHit) {
    return {
      ...placeHit,
      country: input.country || placeHit.country,
      region: input.region || placeHit.region,
      placeName: input.placeName || placeHit.placeName
    };
  }

  const countryHit = countryFallbacks.find(
    (hit) => normalizedCountry && normalize(hit.country) === normalizedCountry
  );

  if (countryHit) {
    return {
      ...countryHit,
      region: input.region,
      placeName: input.placeName || input.region || countryHit.placeName
    };
  }

  return null;
}

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}
