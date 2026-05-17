import {
  conflictKeywordPattern,
  conflictNewsFeeds
} from "@/data/conflictNewsFeeds";
import { publicCrisisRssFeeds } from "@/data/rssFeeds";
import { sourceToRawSourceId } from "@/data/sourceCatalog";
import { normalizeSourcePayload, type SourceId } from "@/lib/osint/normalize";
import { parseRssItems } from "@/lib/osint/rss";
import {
  recordRssFeedHealth,
  seedInfrastructure,
  seedSources,
  storeNormalizedReports
} from "@/lib/server/osintRepository";

export type IngestResult = {
  source: SourceId;
  mode: "production";
  warning?: string;
  fetchedReports: number;
  rawReports: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsArchived: number;
  skipped: number;
};

type LoadedPayload = {
  payload: unknown;
  warning?: string;
  feedStats?: FeedLoadStat[];
};

export type FeedLoadStat = {
  feedId: string;
  ok: boolean;
  itemCount: number;
  error?: string;
};

export const productionSourceIds = [
  "gdelt",
  "gdelt-doc",
  "reliefweb",
  "usgs",
  "emsc",
  "gdacs",
  "eonet",
  "conflict-news",
  "rss"
] as const satisfies readonly SourceId[];

export async function ingestSource(source: SourceId): Promise<IngestResult> {
  await seedSources();
  await seedInfrastructure();
  const { reports, warning, feedStats } = await fetchNormalizedReports(source);
  await recordRssFeedHealth(feedStats ?? []);
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
  const { payload, warning, feedStats } = await loadPayload(source);

  return {
    reports: normalizeSourcePayload(source, payload),
    warning,
    feedStats
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
      case "conflict-news":
        return await loadConflictNewsPayload();
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
    "((earthquake OR flood OR wildfire OR hurricane OR protest OR hospital OR power outage OR water shortage OR rail disruption OR communications outage OR humanitarian crisis) OR ((Ukraine OR Ukrainian OR Russia OR Russian OR Donetsk OR Luhansk OR Kherson OR Zaporizhzhia OR Kharkiv OR Pokrovsk) (shelling OR missile OR drone OR strike OR attack OR evacuation OR occupation OR humanitarian OR frontline OR front line)))"
  );
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "150");
  url.searchParams.set("sort", "hybridrel");
  url.searchParams.set("timespan", "30d");

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
  const { items, failures, stats } = await loadFeedBatch(
    publicCrisisRssFeeds.map((feed) => ({
      ...feed,
      country: feed.sourceCountry,
      language: feed.sourceLanguage
    })),
    {
      maxFeeds: numberFromEnv("HELLFIRE_RSS_MAX_FEEDS", 560),
      maxItemsPerFeed: numberFromEnv("HELLFIRE_RSS_ITEMS_PER_FEED", 5)
    }
  );

  return {
    payload: items,
    feedStats: stats,
    warning:
      failures.length > 0
        ? `${failures.length} RSS feed(s) konnten nicht geladen werden.`
        : undefined
  };
}

async function loadConflictNewsPayload() {
  const { items, failures, stats } = await loadFeedBatch(
    conflictNewsFeeds.map((feed) => ({
      ...feed,
      country: feed.sourceCountry,
      language: feed.sourceLanguage,
      defaultCategoryHint:
        "ukraine russia war conflict shelling missile strike drone ceasefire invasion occupation refugee humanitarian"
    })),
    {
      maxFeeds: numberFromEnv("HELLFIRE_CONFLICT_RSS_MAX_FEEDS", 260),
      maxItemsPerFeed: numberFromEnv("HELLFIRE_CONFLICT_RSS_ITEMS_PER_FEED", 6),
      filter: (item) => {
        const text = [
          item.title,
          item.description,
          item.summary,
          item["content:encoded"],
          item.category
        ]
          .filter(Boolean)
          .join(" ");

        return conflictKeywordPattern.test(text);
      }
    }
  );

  return {
    payload: items,
    feedStats: stats,
    warning:
      failures.length > 0
        ? `${failures.length} conflict-news feed(s) konnten nicht geladen werden.`
        : undefined
  };
}

type BatchFeed = {
  id: string;
  name: string;
  url: string;
  defaultCategoryHint?: string;
  country?: string;
  language?: string;
};

async function loadFeedBatch(
  feeds: BatchFeed[],
  options: {
    maxFeeds: number;
    maxItemsPerFeed: number;
    filter?: (item: Record<string, unknown>) => boolean;
  }
) {
  const selectedFeeds = feeds.filter(Boolean).slice(0, options.maxFeeds);
  const concurrency = numberFromEnv("HELLFIRE_RSS_CONCURRENCY", 16);
  const failures: string[] = [];
  const stats: FeedLoadStat[] = [];
  const items: Record<string, unknown>[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < selectedFeeds.length) {
      const feed = selectedFeeds[cursor];
      cursor += 1;

      try {
        const xml = await fetchText(new URL(feed.url));
        const parsed = parseRssItems(xml, {
          feedId: feed.id,
          feedName: feed.name,
          feedUrl: feed.url,
          sourceCountry: feed.country,
          sourceLanguage: feed.language,
          categoryHint: feed.defaultCategoryHint
        });
        const filtered = options.filter ? parsed.filter(options.filter) : parsed;
        const limited = filtered.slice(0, options.maxItemsPerFeed);
        items.push(...limited);
        stats.push({
          feedId: sourceToRawSourceId(feed),
          ok: true,
          itemCount: limited.length
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Feed unavailable";
        failures.push(`${feed.id}: ${message}`);
        stats.push({
          feedId: sourceToRawSourceId(feed),
          ok: false,
          itemCount: 0,
          error: message
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, selectedFeeds.length)) }, () =>
      worker()
    )
  );

  return { items, failures, stats };
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
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    numberFromEnv("HELLFIRE_RSS_TIMEOUT_MS", 6500)
  );

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/rss+xml, application/xml, text/xml, */*",
        "user-agent": "HellFire local crisis monitor MVP"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function emptyPayload(source: SourceId) {
  if (source === "usgs" || source === "emsc") {
    return { type: "FeatureCollection", features: [] };
  }

  return [];
}
