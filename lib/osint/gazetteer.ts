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
  { country: "Ukraine", region: "Kharkiv", placeName: "Kharkiv", latitude: 49.9935, longitude: 36.2304, confidence: 0.78 },
  { country: "Ukraine", region: "Donetsk", placeName: "Donetsk", latitude: 48.0159, longitude: 37.8029, confidence: 0.72 },
  { country: "Ukraine", region: "Luhansk", placeName: "Luhansk", latitude: 48.574, longitude: 39.3078, confidence: 0.72 },
  { country: "Ukraine", region: "Kherson", placeName: "Kherson", latitude: 46.6354, longitude: 32.6169, confidence: 0.72 },
  { country: "Ukraine", region: "Zaporizhzhia", placeName: "Zaporizhzhia", latitude: 47.8388, longitude: 35.1396, confidence: 0.72 },
  { country: "Ukraine", region: "Odesa", placeName: "Odesa", latitude: 46.4825, longitude: 30.7233, confidence: 0.72 },
  { country: "Ukraine", region: "Dnipropetrovsk", placeName: "Dnipro", latitude: 48.4647, longitude: 35.0462, confidence: 0.72 },
  { country: "Ukraine", region: "Dnipropetrovsk", placeName: "Dnipropetrovsk region", latitude: 48.4647, longitude: 35.0462, confidence: 0.68 },
  { country: "Ukraine", region: "Dnipropetrovsk", placeName: "Kryvyi Rih", latitude: 47.9105, longitude: 33.3918, confidence: 0.7 },
  { country: "Ukraine", region: "Dnipropetrovsk", placeName: "Nikopol", latitude: 47.5667, longitude: 34.4, confidence: 0.72 },
  { country: "Ukraine", region: "Poltava", placeName: "Poltava", latitude: 49.5883, longitude: 34.5514, confidence: 0.72 },
  { country: "Ukraine", region: "Sumy", placeName: "Sumy", latitude: 50.9077, longitude: 34.7981, confidence: 0.7 },
  { country: "Ukraine", region: "Kharkiv", placeName: "Kupiansk", latitude: 49.7106, longitude: 37.6156, confidence: 0.68 },
  { country: "Ukraine", region: "Donetsk", placeName: "Pokrovsk", latitude: 48.282, longitude: 37.1758, confidence: 0.7 },
  { country: "Ukraine", region: "Donetsk", placeName: "Kramatorsk", latitude: 48.738, longitude: 37.5844, confidence: 0.68 },
  { country: "Ukraine", region: "Donetsk", placeName: "Sloviansk", latitude: 48.8532, longitude: 37.6053, confidence: 0.68 },
  { country: "Ukraine", region: "Donetsk", placeName: "Toretsk", latitude: 48.3987, longitude: 37.8479, confidence: 0.66 },
  { country: "Ukraine", region: "Donetsk", placeName: "Chasiv Yar", latitude: 48.5935, longitude: 37.8572, confidence: 0.66 },
  { country: "Ukraine", region: "Donetsk", placeName: "Bakhmut", latitude: 48.5944, longitude: 37.9998, confidence: 0.66 },
  { country: "Ukraine", region: "Donetsk", placeName: "Avdiivka", latitude: 48.1399, longitude: 37.7426, confidence: 0.66 },
  { country: "Ukraine", region: "Donetsk", placeName: "Mariupol", latitude: 47.0971, longitude: 37.5434, confidence: 0.66 },
  { country: "Ukraine", region: "Zaporizhzhia", placeName: "Melitopol", latitude: 46.8489, longitude: 35.3653, confidence: 0.66 },
  { country: "Ukraine", region: "Zaporizhzhia", placeName: "Berdyansk", latitude: 46.755, longitude: 36.7889, confidence: 0.66 },
  { country: "Ukraine", region: "Crimea", placeName: "Crimea", latitude: 45.3453, longitude: 34.4997, confidence: 0.68 },
  { country: "Russia", region: "Moscow", placeName: "Moscow", latitude: 55.7558, longitude: 37.6173, confidence: 0.72 },
  { country: "Russia", region: "Belgorod", placeName: "Belgorod", latitude: 50.5977, longitude: 36.5858, confidence: 0.72 },
  { country: "Russia", region: "Kursk", placeName: "Kursk", latitude: 51.7304, longitude: 36.1926, confidence: 0.68 },
  { country: "Russia", region: "Ryazan", placeName: "Ryazan", latitude: 54.6296, longitude: 39.7419, confidence: 0.72 },
  { country: "Russia", region: "Stavropol Krai", placeName: "Stavropol Krai", latitude: 45.05, longitude: 43.2667, confidence: 0.62 },
  { country: "Russia", region: "Astrakhan Oblast", placeName: "Astrakhan Region", latitude: 46.3497, longitude: 48.0408, confidence: 0.62 },
  { country: "Turkey", region: "Samsun", placeName: "Samsun", latitude: 41.2867, longitude: 36.33, confidence: 0.72 },
  { country: "Israel", region: "Jerusalem", placeName: "Jerusalem", latitude: 31.7683, longitude: 35.2137, confidence: 0.76 },
  { country: "Israel", region: "Tel Aviv", placeName: "Tel Aviv", latitude: 32.0853, longitude: 34.7818, confidence: 0.76 },
  { country: "Palestinian Territories", region: "Gaza", placeName: "Gaza", latitude: 31.5017, longitude: 34.4668, confidence: 0.76 },
  { country: "Palestinian Territories", region: "Rafah", placeName: "Rafah", latitude: 31.2969, longitude: 34.2435, confidence: 0.72 },
  { country: "Palestinian Territories", region: "Khan Younis", placeName: "Khan Younis", latitude: 31.3462, longitude: 34.3063, confidence: 0.72 },
  { country: "Palestinian Territories", region: "West Bank", placeName: "West Bank", latitude: 31.9466, longitude: 35.3027, confidence: 0.68 },
  { country: "Palestinian Territories", region: "Ramallah", placeName: "Ramallah", latitude: 31.9038, longitude: 35.2034, confidence: 0.72 },
  { country: "Lebanon", region: "Beirut", placeName: "Beirut", latitude: 33.8938, longitude: 35.5018, confidence: 0.72 },
  { country: "Lebanon", region: "South Governorate", placeName: "Southern Lebanon", latitude: 33.2776, longitude: 35.2033, confidence: 0.64 },
  { country: "Syria", region: "Damascus", placeName: "Damascus", latitude: 33.5138, longitude: 36.2765, confidence: 0.72 },
  { country: "Iran", region: "Tehran", placeName: "Tehran", latitude: 35.6892, longitude: 51.389, confidence: 0.72 },
  { country: "Sudan", region: "Khartoum", placeName: "Khartoum", latitude: 15.5007, longitude: 32.5599, confidence: 0.72 },
  { country: "Sudan", region: "Darfur", placeName: "Darfur", latitude: 13.626, longitude: 25.3549, confidence: 0.64 },
  { country: "Democratic Republic of the Congo", region: "Kinshasa", placeName: "Kinshasa", latitude: -4.4419, longitude: 15.2663, confidence: 0.72 },
  { country: "Democratic Republic of the Congo", region: "Eastern DRC", placeName: "Eastern Democratic Republic of the Congo", latitude: -1.45, longitude: 28.2, confidence: 0.58 },
  { country: "Yemen", region: "Sanaa", placeName: "Sanaa", latitude: 15.3694, longitude: 44.191, confidence: 0.72 },
  { country: "Myanmar", region: "Naypyidaw", placeName: "Myanmar", latitude: 19.7633, longitude: 96.0785, confidence: 0.58 },
  { country: "Myanmar", region: "Rakhine", placeName: "Rakhine", latitude: 20.1041, longitude: 93.5813, confidence: 0.62 },
  { country: "Kenya", region: "Kisumu", placeName: "Kisumu", latitude: -0.0917, longitude: 34.768, confidence: 0.78 },
  { country: "Haiti", region: "Ouest", placeName: "Port-au-Prince", latitude: 18.5944, longitude: -72.3074, confidence: 0.78 },
  { country: "Bangladesh", region: "Dhaka", placeName: "Dhaka", latitude: 23.8103, longitude: 90.4125, confidence: 0.78 },
  { country: "Japan", region: "Miyagi", placeName: "Ishinomaki", latitude: 38.4345, longitude: 141.3029, confidence: 0.72 },
  { country: "Japan", region: "Tokyo", placeName: "Tokyo", latitude: 35.6762, longitude: 139.6503, confidence: 0.74 },
  { country: "Canada", region: "Ontario", placeName: "Toronto", latitude: 43.6532, longitude: -79.3832, confidence: 0.74 },
  { country: "Chile", region: "Valparaiso", placeName: "Valparaiso", latitude: -33.0472, longitude: -71.6127, confidence: 0.72 },
  { country: "United States", region: "New York", placeName: "New York City", latitude: 40.7128, longitude: -74.006, confidence: 0.72 },
  { country: "France", region: "Ile-de-France", placeName: "Paris", latitude: 48.8566, longitude: 2.3522, confidence: 0.72 },
  { country: "United Kingdom", region: "England", placeName: "London", latitude: 51.5072, longitude: -0.1276, confidence: 0.72 },
  { country: "Brazil", region: "Rio de Janeiro", placeName: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729, confidence: 0.72 },
  { country: "Australia", region: "New South Wales", placeName: "Sydney", latitude: -33.8688, longitude: 151.2093, confidence: 0.72 },
  { country: "China", region: "Shanghai", placeName: "Shanghai", latitude: 31.2304, longitude: 121.4737, confidence: 0.72 },
  { country: "China", region: "Jiangsu", placeName: "Nanjing", latitude: 32.0603, longitude: 118.7969, confidence: 0.72 },
  { country: "India", region: "Jammu and Kashmir", placeName: "Kashmir", latitude: 34.0837, longitude: 74.7973, confidence: 0.64 },
  { country: "Pakistan", region: "Khyber Pakhtunkhwa", placeName: "Bannu", latitude: 32.9861, longitude: 70.6042, confidence: 0.72 },
  { country: "United Arab Emirates", placeName: "United Arab Emirates", latitude: 23.4241, longitude: 53.8478, confidence: 0.62 },
  { country: "United Arab Emirates", region: "Dubai", placeName: "Dubai", latitude: 25.2048, longitude: 55.2708, confidence: 0.72 },
  { country: "United Arab Emirates", region: "Abu Dhabi", placeName: "Abu Dhabi", latitude: 24.4539, longitude: 54.3773, confidence: 0.72 },
  { country: "United Arab Emirates", region: "Abu Dhabi", placeName: "Barakah Nuclear Power Plant", latitude: 23.968, longitude: 52.235, confidence: 0.74 },
  { country: "Iran", region: "Strait of Hormuz", placeName: "Strait of Hormuz", latitude: 26.566, longitude: 56.25, confidence: 0.62 },
  { country: "Angola", region: "Luanda", placeName: "Luanda", latitude: -8.839, longitude: 13.2894, confidence: 0.72 },
  { country: "Angola", region: "Northern Angola", placeName: "Northern Angola", latitude: -7.6, longitude: 15.0, confidence: 0.62 },
  { country: "United States", region: "California", placeName: "California", latitude: 36.7783, longitude: -119.4179, confidence: 0.58 },
  { country: "United States", region: "Utah", placeName: "Utah", latitude: 39.321, longitude: -111.0937, confidence: 0.58 },
  { country: "United States", region: "Louisiana", placeName: "Louisiana", latitude: 30.9843, longitude: -91.9623, confidence: 0.58 }
];

const countryFallbacks: GazetteerHit[] = [
  { country: "Germany", placeName: "Germany", latitude: 51.1657, longitude: 10.4515, confidence: 0.48 },
  { country: "Ukraine", placeName: "Ukraine", latitude: 48.3794, longitude: 31.1656, confidence: 0.45 },
  { country: "Russia", placeName: "Russia", latitude: 61.524, longitude: 105.3188, confidence: 0.38 },
  { country: "Israel", placeName: "Israel", latitude: 31.0461, longitude: 34.8516, confidence: 0.42 },
  { country: "Palestinian Territories", placeName: "Palestinian Territories", latitude: 31.9522, longitude: 35.2332, confidence: 0.4 },
  { country: "Lebanon", placeName: "Lebanon", latitude: 33.8547, longitude: 35.8623, confidence: 0.4 },
  { country: "Syria", placeName: "Syria", latitude: 34.8021, longitude: 38.9968, confidence: 0.38 },
  { country: "Iran", placeName: "Iran", latitude: 32.4279, longitude: 53.688, confidence: 0.38 },
  { country: "Sudan", placeName: "Sudan", latitude: 12.8628, longitude: 30.2176, confidence: 0.38 },
  { country: "Democratic Republic of the Congo", placeName: "Democratic Republic of the Congo", latitude: -2.8799, longitude: 23.656, confidence: 0.38 },
  { country: "Yemen", placeName: "Yemen", latitude: 15.5527, longitude: 48.5164, confidence: 0.38 },
  { country: "Myanmar", placeName: "Myanmar", latitude: 21.9162, longitude: 95.956, confidence: 0.38 },
  { country: "Kenya", placeName: "Kenya", latitude: 0.0236, longitude: 37.9062, confidence: 0.45 },
  { country: "Haiti", placeName: "Haiti", latitude: 18.9712, longitude: -72.2852, confidence: 0.45 },
  { country: "Bangladesh", placeName: "Bangladesh", latitude: 23.685, longitude: 90.3563, confidence: 0.45 },
  { country: "Japan", placeName: "Japan", latitude: 36.2048, longitude: 138.2529, confidence: 0.42 },
  { country: "Canada", placeName: "Canada", latitude: 56.1304, longitude: -106.3468, confidence: 0.38 },
  { country: "Chile", placeName: "Chile", latitude: -35.6751, longitude: -71.543, confidence: 0.42 },
  { country: "United States", placeName: "United States", latitude: 39.8283, longitude: -98.5795, confidence: 0.38 },
  { country: "India", placeName: "India", latitude: 20.5937, longitude: 78.9629, confidence: 0.38 },
  { country: "Pakistan", placeName: "Pakistan", latitude: 30.3753, longitude: 69.3451, confidence: 0.38 },
  { country: "Afghanistan", placeName: "Afghanistan", latitude: 33.9391, longitude: 67.71, confidence: 0.38 },
  { country: "Iraq", placeName: "Iraq", latitude: 33.2232, longitude: 43.6793, confidence: 0.38 },
  { country: "United Arab Emirates", placeName: "United Arab Emirates", latitude: 23.4241, longitude: 53.8478, confidence: 0.38 },
  { country: "Turkey", placeName: "Turkey", latitude: 38.9637, longitude: 35.2433, confidence: 0.38 },
  { country: "Somalia", placeName: "Somalia", latitude: 5.1521, longitude: 46.1996, confidence: 0.38 },
  { country: "Libya", placeName: "Libya", latitude: 26.3351, longitude: 17.2283, confidence: 0.38 },
  { country: "Mali", placeName: "Mali", latitude: 17.5707, longitude: -3.9962, confidence: 0.38 },
  { country: "Burkina Faso", placeName: "Burkina Faso", latitude: 12.2383, longitude: -1.5616, confidence: 0.38 },
  { country: "Angola", placeName: "Angola", latitude: -11.2027, longitude: 17.8739, confidence: 0.38 }
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
      country: placeHit.country,
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
