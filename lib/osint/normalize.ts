import { resolveLocation } from "@/lib/osint/gazetteer";
import type { EventCategory, RawReport } from "@/types/events";

export type SourceId =
  | "gdelt"
  | "gdelt-doc"
  | "reliefweb"
  | "usgs"
  | "gdacs"
  | "eonet"
  | "emsc"
  | "conflict-news"
  | "rss";

export type NormalizedReport = Omit<
  RawReport,
  "id" | "eventId" | "processedAt" | "createdAt"
> & {
  sourceId: SourceId;
  normalizedPayload: Record<string, unknown>;
};

const sourceNames: Record<SourceId, string> = {
  gdelt: "GDELT Cloud v2",
  "gdelt-doc": "GDELT Project Doc 2.1",
  reliefweb: "ReliefWeb",
  usgs: "USGS Earthquake Hazards Program",
  gdacs: "GDACS Disaster Alerts",
  eonet: "NASA EONET",
  emsc: "EMSC SeismicPortal",
  "conflict-news": "International Conflict News",
  rss: "Public Crisis RSS"
};

export function normalizeSourcePayload(
  sourceId: SourceId,
  payload: unknown
): NormalizedReport[] {
  if (sourceId === "gdelt") {
    return getPayloadItems(payload).map((item) => normalizeGdeltReport(item));
  }

  if (sourceId === "gdelt-doc") {
    return getPayloadItems(payload).map((item) => normalizeGdeltDocArticle(item));
  }

  if (sourceId === "reliefweb") {
    return getPayloadItems(payload).map((item) => normalizeReliefWebReport(item));
  }

  if (sourceId === "usgs" || sourceId === "emsc") {
    return getGeoJsonFeatures(payload).map((item) =>
      normalizeEarthquakeFeature(item, sourceId)
    );
  }

  if (sourceId === "eonet") {
    return getPayloadItems(payload).map((item) => normalizeEonetEvent(item));
  }

  return getPayloadItems(payload).map((item) =>
    normalizeRssItem(item, sourceId)
  );
}

function normalizeGdeltReport(item: Record<string, unknown>): NormalizedReport {
  const title =
    stringValue(item.title) ||
    stringValue(item.name) ||
    stringValue(item.eventtitle) ||
    "GDELT report";
  const description =
    stringValue(item.summary) ||
    stringValue(item.description) ||
    stringValue(item.snippet) ||
    title;
  const country =
    stringValue(item.country) ||
    stringValue(item.countryname) ||
    stringValue(item.actionGeo_CountryCode);
  const region = stringValue(item.region) || stringValue(item.admin1);
  const placeName =
    stringValue(item.place) ||
    stringValue(item.location) ||
    stringValue(item.actionGeo_FullName) ||
    region ||
    country;
  const latitude = numberValue(item.latitude) ?? numberValue(item.actionGeo_Lat);
  const longitude = numberValue(item.longitude) ?? numberValue(item.actionGeo_Long);
  const eventTime = dateString(
    item.eventTime ?? item.date ?? item.seendate ?? item.SQLDATE
  );
  const detectedTime = dateString(item.detectedTime ?? item.createdAt) || nowIso();
  const category = classifyCategory([title, description, String(item.themes || "")]);
  const location = resolveLocation({ country, region, placeName, latitude, longitude });
  const confidence = applyGeocodePenalty(baseConfidence("gdelt", category), location?.confidence);

  return {
    sourceId: "gdelt",
    sourceName: sourceNames.gdelt,
    externalId: stringValue(item.id) || stringValue(item.url) || stableExternalId(title),
    title,
    description,
    url: stringValue(item.url),
    country: location?.country || country,
    region: location?.region || region,
    placeName: location?.placeName || placeName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    eventTime: eventTime || detectedTime,
    detectedTime,
    category,
    severity: inferSeverity(category, title, description),
    confidence,
    geocodeConfidence: location?.confidence ?? 0.25,
    rawPayload: item,
    normalizedPayload: { title, category, source: "gdelt" }
  };
}

function normalizeGdeltDocArticle(item: Record<string, unknown>): NormalizedReport {
  const title = stringValue(item.title) || "GDELT article";
  const description =
    stringValue(item.seendate) ||
    stringValue(item.domain) ||
    stringValue(item.language) ||
    title;
  const url = stringValue(item.url);
  const country = stringValue(item.sourceCountry) || stringValue(item.country);
  const region = stringValue(item.region);
  const placeName = extractPlaceFromText(title) || region || country;
  const eventTime = dateString(item.seendate) || nowIso();
  const category = classifyCategory([title, description]);
  const location = resolveLocation({ country, region, placeName });
  const confidence = applyGeocodePenalty(
    baseConfidence("gdelt-doc", category),
    location?.confidence
  );

  return {
    sourceId: "gdelt-doc",
    sourceName: sourceNames["gdelt-doc"],
    externalId: url || stableExternalId(title),
    title,
    description,
    url,
    country: location?.country || country,
    region: location?.region || region,
    placeName: location?.placeName || placeName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    eventTime,
    detectedTime: nowIso(),
    category,
    severity: inferSeverity(category, title, description),
    confidence,
    geocodeConfidence: location?.confidence ?? 0.25,
    rawPayload: item,
    normalizedPayload: { title, category, source: "gdelt-doc" }
  };
}

function normalizeReliefWebReport(item: Record<string, unknown>): NormalizedReport {
  const fields = recordValue(item.fields) || item;
  const locations = arrayValue(fields.location);
  const primaryLocation = recordValue(locations[0]);
  const country =
    stringValue(recordValue(fields.primary_country)?.name) ||
    stringValue(recordValue(arrayValue(fields.country)[0])?.name);
  const region = stringValue(primaryLocation?.admin1) || stringValue(primaryLocation?.name);
  const placeName = stringValue(primaryLocation?.name) || region || country;
  const title = stringValue(fields.title) || "ReliefWeb report";
  const description =
    stringValue(fields.body) ||
    stringValue(fields.summary) ||
    stringValue(fields.headline) ||
    title;
  const latitude = numberValue(primaryLocation?.lat) ?? numberValue(primaryLocation?.latitude);
  const longitude = numberValue(primaryLocation?.lon) ?? numberValue(primaryLocation?.longitude);
  const disasterType = arrayValue(fields.disaster_type)
    .map((entry) => stringValue(recordValue(entry)?.name))
    .filter(Boolean)
    .join(" ");
  const category = classifyCategory([title, description, disasterType || "disaster"]);
  const eventTime = dateString(recordValue(fields.date)?.original ?? recordValue(fields.date)?.created);
  const detectedTime = dateString(recordValue(fields.date)?.created) || nowIso();
  const location = resolveLocation({ country, region, placeName, latitude, longitude });
  const confidence = applyGeocodePenalty(
    baseConfidence("reliefweb", category),
    location?.confidence
  );

  return {
    sourceId: "reliefweb",
    sourceName: sourceNames.reliefweb,
    externalId: stringValue(item.id) || stableExternalId(title),
    title,
    description,
    url: stringValue(fields.url),
    country: location?.country || country,
    region: location?.region || region,
    placeName: location?.placeName || placeName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    eventTime: eventTime || detectedTime,
    detectedTime,
    category,
    severity: inferSeverity(category, title, description),
    confidence,
    geocodeConfidence: location?.confidence ?? 0.25,
    rawPayload: item,
    normalizedPayload: { title, category, source: "reliefweb" }
  };
}

function normalizeEarthquakeFeature(
  item: Record<string, unknown>,
  sourceId: Extract<SourceId, "usgs" | "emsc">
): NormalizedReport {
  const properties = recordValue(item.properties) || {};
  const geometry = recordValue(item.geometry) || {};
  const coordinates = arrayValue(geometry.coordinates);
  const longitude = numberValue(coordinates[0]);
  const latitude = numberValue(coordinates[1]);
  const magnitude = numberValue(properties.mag) ?? 0;
  const title =
    stringValue(properties.title) ||
    `M ${magnitude.toFixed(1)} - ${
      stringValue(properties.flynn_region) || "Earthquake epicenter"
    }`;
  const placeName =
    stringValue(properties.place) ||
    stringValue(properties.flynn_region) ||
    "Earthquake epicenter";
  const country = inferCountryFromPlace(placeName);
  const location = resolveLocation({
    country,
    placeName,
    latitude,
    longitude
  });
  const eventTime = dateString(properties.time);
  const detectedTime =
    dateString(properties.updated) ||
    dateString(properties.lastupdate) ||
    nowIso();

  return {
    sourceId,
    sourceName: sourceNames[sourceId],
    externalId: stringValue(item.id) || stringValue(properties.unid) || stableExternalId(title),
    title,
    description: `${title}. Magnitude ${magnitude.toFixed(1)} earthquake reported by ${sourceNames[sourceId]}.`,
    url: stringValue(properties.url),
    country: location?.country || country,
    region: location?.region,
    placeName: location?.placeName || placeName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    eventTime: eventTime || detectedTime,
    detectedTime,
    category: "earthquake",
    severity: severityFromMagnitude(magnitude),
    confidence: 0.92,
    geocodeConfidence: location?.confidence ?? 1,
    rawPayload: item,
    normalizedPayload: { magnitude, source: sourceId }
  };
}

function normalizeEonetEvent(item: Record<string, unknown>): NormalizedReport {
  const geometries = arrayValue(item.geometry).filter(isRecord);
  const latestGeometry = geometries.at(-1) || {};
  const coordinates = arrayValue(latestGeometry.coordinates);
  const longitude = numberValue(coordinates[0]);
  const latitude = numberValue(coordinates[1]);
  const title = stringValue(item.title) || "NASA EONET event";
  const description = stringValue(item.description) || title;
  const categoryTitles = arrayValue(item.categories)
    .map((entry) => stringValue(recordValue(entry)?.title) || stringValue(recordValue(entry)?.id))
    .filter(Boolean)
    .join(" ");
  const category = classifyCategory([title, description, categoryTitles]);
  const placeName = extractPlaceFromText(title);
  const location = resolveLocation({ placeName, latitude, longitude });
  const eventTime = dateString(latestGeometry.date) || nowIso();

  return {
    sourceId: "eonet",
    sourceName: sourceNames.eonet,
    externalId: stringValue(item.id) || stableExternalId(title),
    title,
    description,
    url: stringValue(item.link) || stringValue(recordValue(arrayValue(item.sources)[0])?.url),
    country: location?.country,
    region: location?.region,
    placeName: location?.placeName || placeName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    eventTime,
    detectedTime: nowIso(),
    category,
    severity: inferSeverity(category, title, description),
    confidence: applyGeocodePenalty(0.82, location?.confidence ?? 1),
    geocodeConfidence: location?.confidence ?? 1,
    rawPayload: item,
    normalizedPayload: { title, category, source: "eonet" }
  };
}

function normalizeRssItem(
  item: Record<string, unknown>,
  sourceId: Extract<SourceId, "gdacs" | "rss" | "conflict-news">
): NormalizedReport {
  const title = stringValue(item.title) || "RSS report";
  const description = stripHtml(stringValue(item.description) || stringValue(item.summary) || title);
  const url =
    stringValue(item.link) ||
    stringValue(recordValue(item.guid)?.["#text"]) ||
    stringValue(item.guid);
  const georssPoint = stringValue(item["georss:point"]);
  const [georssLat, georssLon] = georssPoint.split(/\s+/).map(Number);
  const point = recordValue(item["geo:Point"]);
  const latitude =
    numberValue(point?.["geo:lat"]) ??
    numberValue(item["geo:lat"]) ??
    (Number.isFinite(georssLat) ? georssLat : undefined);
  const longitude =
    numberValue(point?.["geo:long"]) ??
    numberValue(item["geo:long"]) ??
    (Number.isFinite(georssLon) ? georssLon : undefined);
  const country =
    stringValue(item["gdacs:country"]) ||
    extractCountryFromText(title) ||
    extractCountryFromText(description);
  const region = stringValue(item.region);
  const placeName =
    stringValue(item["gdacs:eventname"]) ||
    extractPlaceFromText(title) ||
    country;
  const category = classifyCategory([
    title,
    description,
    stringValue(item.categoryHint),
    stringValue(item["gdacs:eventtype"])
  ]);
  const location = resolveLocation({ country, region, placeName, latitude, longitude });
  const eventTime =
    dateString(item["gdacs:fromdate"]) ||
    dateString(item.pubDate) ||
    dateString(item.isoDate) ||
    nowIso();
  const feedName = stringValue(item.feedName) || sourceNames[sourceId];
  const sourceCountry = stringValue(item.sourceCountry);

  return {
    sourceId,
    sourceName: feedName,
    externalId:
      stringValue(recordValue(item.guid)?.["#text"]) ||
      stringValue(item.guid) ||
      url ||
      stableExternalId(`${feedName}:${title}`),
    title,
    description,
    url,
    country: location?.country || country,
    region: location?.region || region,
    placeName: location?.placeName || placeName,
    latitude: location?.latitude,
    longitude: location?.longitude,
    eventTime,
    detectedTime: dateString(item.pubDate) || nowIso(),
    category,
    severity: severityFromRss(category, item, title, description),
    confidence: applyGeocodePenalty(
      sourceId === "gdacs" ? 0.86 : sourceId === "conflict-news" ? 0.68 : 0.66,
      location?.confidence
    ),
    geocodeConfidence: location?.confidence ?? 0.25,
    rawPayload: item,
    normalizedPayload: {
      title,
      category,
      source: sourceId,
      feedName,
      sourceCountry,
      sourceLanguage: stringValue(item.sourceLanguage)
    }
  };
}

function getPayloadItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ["data", "events", "articles", "reports", "features"]) {
    const items = payload[key];

    if (Array.isArray(items)) {
      return items.filter(isRecord);
    }
  }

  return [payload];
}

function getGeoJsonFeatures(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) {
    return [];
  }

  const features = payload.features;

  return Array.isArray(features) ? features.filter(isRecord) : [];
}

function classifyCategory(parts: string[]): EventCategory {
  const text = parts.join(" ").toLowerCase();

  if (/(earthquake|magnitude|seismic)/.test(text)) return "earthquake";
  if (/(flood|storm|wildfire|\bfire\b|heatwave|cyclone|hurricane|disaster|landslide|volcano|drought)/.test(text)) {
    return "disaster";
  }
  if (/(war|conflict|clash|violence|shelling|attack|airstrike|air strike|missile strike|drone strike|missile|rocket|drone|ceasefire|invasion|occupation|offensive|frontline|bombardment|hostage|security incident)/.test(text)) {
    return "conflict";
  }
  if (/(protest|demonstration|strike|unrest|rally)/.test(text)) return "protest";
  if (/(hospital|clinic|medical capacity)/.test(text)) return "hospital";
  if (/(health|disease|cholera|outbreak|heat stress)/.test(text)) return "health";
  if (/(power|electric|grid|blackout)/.test(text)) return "power";
  if (/(oil|fuel|terminal|pipeline)/.test(text)) return "oil";
  if (/(bridge|overpass)/.test(text)) return "bridge";
  if (/(rail|train|metro|transit)/.test(text)) return "rail";
  if (/(water|sanitation|pump|drinking)/.test(text)) return "water";
  if (/(communication|telecom|mobile network|internet)/.test(text)) {
    return "communication";
  }
  if (/(unverified|rumor|unconfirmed)/.test(text)) return "unverified";

  return "incident";
}

function severityFromRss(
  category: EventCategory,
  item: Record<string, unknown>,
  title: string,
  description: string
): 1 | 2 | 3 | 4 | 5 {
  const alertLevel = stringValue(item["gdacs:alertlevel"]).toLowerCase();
  const alertScore = numberValue(item["gdacs:alertscore"]);

  if (alertLevel === "red" || (alertScore ?? 0) >= 2) {
    return 5;
  }

  if (alertLevel === "orange" || (alertScore ?? 0) >= 1) {
    return 4;
  }

  return inferSeverity(category, title, description);
}

function extractPlaceFromText(text: string) {
  const knownPlace = extractKnownPlaceFromText(text);

  if (knownPlace) {
    return knownPlace;
  }

  const separators = [" in ", " near ", " at ", " - ", ", "];
  const match = text.match(/\b(?:in|near|at)\s+([A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?)/);

  if (match?.[1]) {
    return match[1].trim();
  }

  for (const separator of separators) {
    const index = text.lastIndexOf(separator);

    if (index >= 0) {
      return text.slice(index + separator.length).replace(/\s+\d{1,2}\/\d{1,2}\/\d{4}.*$/, "").trim();
    }
  }

  return "";
}

function extractKnownPlaceFromText(text: string) {
  const knownPlaces: Array<[RegExp, string]> = [
    [/\bkyiv\b|\bkiev\b/i, "Kyiv"],
    [/\bkharkiv\b/i, "Kharkiv"],
    [/\bdonetsk\b/i, "Donetsk"],
    [/\bluhansk\b/i, "Luhansk"],
    [/\bkherson\b/i, "Kherson"],
    [/\bzaporizhzhia\b|\bzaporizhia\b/i, "Zaporizhzhia"],
    [/\bodesa\b|\bodessa\b/i, "Odesa"],
    [/\bcrimea\b|\bcrimean\b/i, "Crimea"],
    [/\bbelgorod\b/i, "Belgorod"],
    [/\bkursk\b/i, "Kursk"],
    [/\bgaza\b/i, "Gaza"],
    [/\brafah\b/i, "Rafah"],
    [/\bkhan younis\b/i, "Khan Younis"],
    [/\bwest bank\b/i, "West Bank"],
    [/\bramallah\b/i, "Ramallah"],
    [/\bjerusalem\b/i, "Jerusalem"],
    [/\btel aviv\b/i, "Tel Aviv"],
    [/\bsouthern lebanon\b|\bsouth lebanon\b/i, "Southern Lebanon"],
    [/\bbeirut\b/i, "Beirut"],
    [/\bdamascus\b/i, "Damascus"],
    [/\bkhartoum\b/i, "Khartoum"],
    [/\bdarfur\b/i, "Darfur"],
    [/\bsanaa\b|\bsana'a\b/i, "Sanaa"],
    [/\brakhine\b/i, "Rakhine"],
    [/\bkashmir\b/i, "Kashmir"]
  ];
  const match = knownPlaces.find(([pattern]) => pattern.test(text));

  return match?.[1] ?? "";
}

function extractCountryFromText(text: string) {
  const regionAliases: Array<[RegExp, string]> = [
    [/\bgaza\b|\brafah\b|\bkhan younis\b|\bwest bank\b|\bpalestin/i, "Palestinian Territories"],
    [/\btel aviv\b|\bjerusalem\b|\bisrael/i, "Israel"],
    [/\bkyiv\b|\bkiev\b|\bkharkiv\b|\bdonetsk\b|\bluhansk\b|\bkherson\b|\bzaporizhzhia\b|\bzaporizhia\b|\bcrimea\b|\bodesa\b|\bodessa\b|\bukrain/i, "Ukraine"],
    [/\bmoscow\b|\bbelgorod\b|\bkursk\b|\brussia\b|\brussian\b/i, "Russia"],
    [/\bbeirut\b|\blebanon\b|\blebanese\b/i, "Lebanon"],
    [/\bdamascus\b|\bsyria\b|\bsyrian\b/i, "Syria"],
    [/\btehran\b|\biran\b|\birani/i, "Iran"],
    [/\bkhartoum\b|\bdarfur\b|\bsudan\b|\bsudanese\b/i, "Sudan"],
    [/\bsanaa\b|\byemen\b|\byemeni\b/i, "Yemen"],
    [/\bmyanmar\b|\bburma\b|\brakhine\b/i, "Myanmar"],
    [/\bkashmir\b|\bindia\b|\bindian\b/i, "India"],
    [/\bpakistan\b|\bpakistani\b/i, "Pakistan"],
    [/\bafghanistan\b|\bafghan\b/i, "Afghanistan"],
    [/\biraq\b|\biraqi\b/i, "Iraq"],
    [/\bsomalia\b|\bsomali\b/i, "Somalia"],
    [/\blibya\b|\blibyan\b/i, "Libya"],
    [/\bmali\b|\btuareg\b/i, "Mali"],
    [/\bburkina faso\b|\bsahel\b/i, "Burkina Faso"],
    [/\btaiwan\b|\btaipei\b/i, "Taiwan"]
  ];
  const alias = regionAliases.find(([pattern]) => pattern.test(text));

  if (alias) {
    return alias[1];
  }

  const knownCountries = [
    "Argentina",
    "Australia",
    "Afghanistan",
    "Bangladesh",
    "Brazil",
    "Burkina Faso",
    "Canada",
    "Chile",
    "China",
    "France",
    "Germany",
    "Haiti",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Israel",
    "Italy",
    "Japan",
    "Kenya",
    "Lebanon",
    "Libya",
    "Mali",
    "Mexico",
    "Myanmar",
    "Nepal",
    "Pakistan",
    "Philippines",
    "Russia",
    "Somalia",
    "Sudan",
    "Syria",
    "Taiwan",
    "Tonga",
    "Turkey",
    "Ukraine",
    "United Kingdom",
    "United States"
  ];
  const normalized = text.toLowerCase();

  return knownCountries.find((country) => normalized.includes(country.toLowerCase()));
}

function inferSeverity(
  category: EventCategory,
  title: string,
  description: string
): 1 | 2 | 3 | 4 | 5 {
  const text = `${title} ${description}`.toLowerCase();
  const severe =
    /(mass|major|widespread|evacuation|fatal|collapsed|critical|displaced)/.test(text);
  const moderate = /(disrupt|pressure|closure|shortage|capacity|flood|protest)/.test(text);

  if (category === "earthquake") {
    return 3;
  }

  if (severe) {
    return 4;
  }

  if (category === "disaster" || category === "power" || category === "water") {
    return moderate ? 4 : 3;
  }

  if (category === "unverified") {
    return 2;
  }

  return moderate ? 3 : 2;
}

function severityFromMagnitude(magnitude: number): 1 | 2 | 3 | 4 | 5 {
  if (magnitude >= 7) return 5;
  if (magnitude >= 6) return 4;
  if (magnitude >= 4.5) return 3;
  if (magnitude >= 3) return 2;

  return 1;
}

function baseConfidence(sourceId: SourceId, category: EventCategory) {
  if (sourceId === "usgs") return 0.92;
  if (sourceId === "emsc") return 0.9;
  if (sourceId === "gdacs") return 0.86;
  if (sourceId === "eonet") return 0.82;
  if (sourceId === "reliefweb") return 0.78;
  if (sourceId === "conflict-news") return 0.68;
  if (sourceId === "gdelt-doc") return 0.64;
  if (sourceId === "rss") return 0.62;
  if (category === "unverified") return 0.42;

  return 0.62;
}

function applyGeocodePenalty(confidence: number, geocodeConfidence = 0.2) {
  if (geocodeConfidence >= 0.75) {
    return roundConfidence(confidence);
  }

  return roundConfidence(Math.min(confidence, confidence * 0.7 + geocodeConfidence * 0.2));
}

function inferCountryFromPlace(place: string) {
  const parts = place.split(",").map((part) => part.trim()).filter(Boolean);

  return parts.at(-1);
}

function dateString(value: unknown) {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const compactDate = value.match(/^(\d{4})(\d{2})(\d{2})$/);

    if (compactDate) {
      return new Date(
        `${compactDate[1]}-${compactDate[2]}-${compactDate[3]}T00:00:00.000Z`
      ).toISOString();
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return "";
}

function stableExternalId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `derived-${(hash >>> 0).toString(16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function roundConfidence(value: number) {
  return Math.min(0.98, Math.max(0.05, Math.round(value * 1000) / 1000));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
