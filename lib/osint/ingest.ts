import { publicCrisisRssFeeds } from "@/data/rssFeeds";
import { normalizeSourcePayload, type SourceId } from "@/lib/osint/normalize";
import { parseRssItems } from "@/lib/osint/rss";
import { seedInfrastructure, seedSources, storeNormalizedReports } from "@/lib/server/osintRepository";

export type IngestResult = {
  source: SourceId;
  mode: "production";
  warning?: string;
  fetchedReports: number;
  rawReports: number;
  eventsCreated: number;
  eventsUpdated: number;
  skipped: number;
};

type LoadedPayload = {
  payload: unknown;
  warning?: string;
};

export const productionSourceIds = [
  "gdelt",
  "gdelt-doc",
  "reliefweb",
  "usgs",
  "emsc",
  "gdacs",
  "eonet",
  "rss"
] as const satisfies readonly SourceId[];

export async function ingestSource(source: SourceId): Promise<IngestResult> {
  await seedSources();
  await seedInfrastructure();
  const { reports, warning } = await fetchNormalizedReports(source);
  const stats = await storeNormalizedReports(reports);

  return {
    source,
    mode: "production",
    warning,
    fetchedReports: reports.length,
    ...stats
  };
}

export async function ingestAllSources() {
  const results: IngestResult[] = [];

  for (const source of productionSourceIds) {
    results.push(await ingestSource(source));
  }

  return results;
}

export async function fetchNormalizedReports(source: SourceId) {
  const { payload, warning } = await loadPayload(source);

  return {
    reports: normalizeSourcePayload(source, payload),
    warning
  };
}

async function loadPayload(source: SourceId): Promise<LoadedPayload> {
  try {
    switch (source) {
      case "gdelt":
        return await loadGdeltPayload();
      case "gdelt-doc":
        return await loadGdeltDocPayload();
      case "reliefweb":
        return await loadReliefWebPayload();
      case "usgs":
        return await loadUsgsPayload();
      case "emsc":
        return await loadEmscPayload();
      case "gdacs":
        return await loadGdacsPayload();
      case "eonet":
        return await loadEonetPayload();
      case "rss":
        return await loadRssPayload();
    }
  } catch (error) {
    return {
      payload: emptyPayload(source),
      warning: error instanceof Error ? error.message : "Source unavailable"
    };
  }
}

async function loadGdeltPayload() {
  const apiKey = process.env.GDELT_CLOUD_API_KEY?.trim();

  if (!apiKey) {
    return {
      payload: [],
      warning: "GDELT_CLOUD_API_KEY fehlt; GDELT wurde uebersprungen."
    };
  }

  const url = new URL("https://api.gdeltcloud.com/api/v2/events");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "50");
  url.searchParams.set(
    "query",
    "(infrastructure OR earthquake OR flood OR protest OR hospital OR power OR water)"
  );
  url.searchParams.set("token", apiKey);

  return { payload: await fetchJson(url) };
}

async function loadReliefWebPayload() {
  const appName =
    process.env.RELIEFWEB_APP_NAME?.trim() || "HellFire local crisis monitor";

  const url = new URL("https://api.reliefweb.int/v1/reports");
  url.searchParams.set("appname", appName);
  url.searchParams.set("limit", "50");
  url.searchParams.set("profile", "full");
  url.searchParams.set("preset", "latest");
  url.searchParams.append("fields[include][]", "title");
  url.searchParams.append("fields[include][]", "body");
  url.searchParams.append("fields[include][]", "url");
  url.searchParams.append("fields[include][]", "country");
  url.searchParams.append("fields[include][]", "primary_country");
  url.searchParams.append("fields[include][]", "disaster_type");
  url.searchParams.append("fields[include][]", "date");
  url.searchParams.append("fields[include][]", "source");

  return { payload: await fetchJson(url) };
}

async function loadUsgsPayload() {
  const url = new URL(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
  );

  return { payload: await fetchJson(url) };
}

async function loadGdeltDocPayload() {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set(
    "query",
    "(earthquake OR flood OR wildfire OR hurricane OR protest OR hospital OR power outage OR water shortage OR rail disruption OR communications outage OR humanitarian crisis)"
  );
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "75");
  url.searchParams.set("sort", "hybridrel");

  return { payload: await fetchJson(url) };
}

async function loadEmscPayload() {
  const url = new URL("https://www.seismicportal.eu/fdsnws/event/1/query");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "75");
  url.searchParams.set("orderby", "time");
  url.searchParams.set("minmag", "4.5");

  return { payload: await fetchJson(url) };
}

async function loadEonetPayload() {
  const url = new URL("https://eonet.gsfc.nasa.gov/api/v3/events");
  url.searchParams.set("status", "open");
  url.searchParams.set("limit", "75");

  return { payload: await fetchJson(url) };
}

async function loadGdacsPayload() {
  const xml = await fetchText(new URL("https://www.gdacs.org/xml/rss.xml"));

  return {
    payload: parseRssItems(xml, {
      feedId: "gdacs",
      feedName: "GDACS Disaster Alerts",
      categoryHint: "earthquake flood cyclone wildfire volcano disaster humanitarian"
    })
  };
}

async function loadRssPayload() {
  const settled = await Promise.allSettled(
    publicCrisisRssFeeds.map(async (feed) => {
      const xml = await fetchText(new URL(feed.url));

      return parseRssItems(xml, {
        feedId: feed.id,
        feedName: feed.name,
        categoryHint: feed.defaultCategoryHint
      });
    })
  );

  const items = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const failures = settled.filter((result) => result.status === "rejected");

  return {
    payload: items,
    warning:
      failures.length > 0
        ? `${failures.length} RSS feed(s) konnten nicht geladen werden.`
        : undefined
  };
}

async function fetchJson(url: URL) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "HellFire local crisis monitor MVP"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Source returned ${response.status}`);
  }

  return response.json();
}

async function fetchText(url: URL) {
  const response = await fetch(url, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml, */*",
      "user-agent": "HellFire local crisis monitor MVP"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Source returned ${response.status}`);
  }

  return response.text();
}

function emptyPayload(source: SourceId) {
  if (source === "usgs" || source === "emsc") {
    return { type: "FeatureCollection", features: [] };
  }

  return [];
}
