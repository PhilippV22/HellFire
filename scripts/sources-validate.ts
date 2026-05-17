import { enabledGlobalRssSources } from "@/data/sourceCatalog";
import { parseRssItems } from "@/lib/osint/rss";

type ValidationResult = {
  id: string;
  ok: boolean;
  status?: number;
  items: number;
  error?: string;
};

type CatalogSource = (typeof enabledGlobalRssSources)[number];

const maxFeeds = Number(process.env.HELLFIRE_SOURCE_VALIDATE_MAX_FEEDS ?? 850);
const concurrency = Number(process.env.HELLFIRE_SOURCE_VALIDATE_CONCURRENCY ?? 32);
const timeoutMs = Number(process.env.HELLFIRE_SOURCE_VALIDATE_TIMEOUT_MS ?? 12000);
const minimumLive = Number(process.env.HELLFIRE_SOURCE_VALIDATE_MIN_LIVE ?? 500);
const selectedSources = pickValidationSources(enabledGlobalRssSources, maxFeeds);
const duplicateIds = findDuplicates(enabledGlobalRssSources.map((source) => source.id));
const duplicateUrls = findDuplicates(enabledGlobalRssSources.map((source) => source.url));

void main();

async function main() {
  if (duplicateIds.length > 0 || duplicateUrls.length > 0) {
    process.stderr.write(
      [
        duplicateIds.length ? `Duplicate source ids: ${duplicateIds.join(", ")}` : "",
        duplicateUrls.length ? `Duplicate source URLs: ${duplicateUrls.join(", ")}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(1);
  }

  const results = await validateSources(selectedSources);
  const ok = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);

  process.stdout.write("HellFire Source Validation\n");
  process.stdout.write(`Catalog sources: ${enabledGlobalRssSources.length}\n`);
  process.stdout.write(`Live checked: ${results.length}\n`);
  process.stdout.write(`Live active: ${ok.length}\n`);
  process.stdout.write(`Failed: ${failed.length}\n`);

  if (failed.length > 0) {
    process.stdout.write("\nSample failures:\n");

    for (const failure of failed.slice(0, 15)) {
      process.stdout.write(
        `- ${failure.id}: ${failure.status ?? "n/a"} ${failure.error ?? "no items"}\n`
      );
    }
  }

  if (enabledGlobalRssSources.length < 500) {
    process.stderr.write("Expected at least 500 enabled source catalog entries.\n");
    process.exit(1);
  }

  if (ok.length < minimumLive) {
    process.stderr.write(
      `Expected at least ${minimumLive} live-active feeds in validation sample.\n`
    );
    process.exit(1);
  }
}

async function validateSources(
  sources: typeof enabledGlobalRssSources
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < sources.length) {
      const source = sources[cursor];
      cursor += 1;
      results.push(await validateSource(source));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, sources.length) }, () => worker())
  );

  return results;
}

async function validateSource(
  source: CatalogSource
): Promise<ValidationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(source.url, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "user-agent": "HellFire source validator"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return { id: source.id, ok: false, status: response.status, items: 0 };
    }

    const xml = await response.text();
    const items = parseRssItems(xml, {
      feedId: source.id,
      feedName: source.name,
      feedUrl: source.url,
      sourceCountry: source.country,
      sourceLanguage: source.language,
      categoryHint: source.defaultCategoryHint
    });

    return {
      id: source.id,
      ok: items.length > 0,
      status: response.status,
      items: items.length,
      error: items.length > 0 ? undefined : "no parseable items"
    };
  } catch (error) {
    return {
      id: source.id,
      ok: false,
      items: 0,
      error: error instanceof Error ? error.message : "fetch failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

function pickValidationSources(
  sources: typeof enabledGlobalRssSources,
  maxCount: number
) {
  const byCountry = new Map<string, typeof enabledGlobalRssSources>();

  for (const source of sources) {
    const bucket = byCountry.get(source.countryCode) ?? [];
    bucket.push(source);
    byCountry.set(source.countryCode, bucket);
  }

  const selected: typeof enabledGlobalRssSources = [];
  const seen = new Set<string>();

  for (const bucket of byCountry.values()) {
    const source = bestValidationSource(bucket);
    selected.push(source);
    seen.add(source.id);
  }

  for (const source of sources.slice().sort(compareValidationPriority)) {
    if (selected.length >= maxCount) {
      break;
    }

    if (seen.has(source.id)) {
      continue;
    }

    selected.push(source);
    seen.add(source.id);
  }

  for (const source of sources) {
    if (selected.length >= maxCount) {
      break;
    }

    if (seen.has(source.id)) {
      continue;
    }

    selected.push(source);
    seen.add(source.id);
  }

  return selected.slice(0, maxCount);
}

function bestValidationSource(sources: CatalogSource[]) {
  return sources.slice().sort(compareValidationPriority)[0];
}

function compareValidationPriority(a: CatalogSource, b: CatalogSource) {
  return (
    validationScore(b) - validationScore(a) ||
    a.country.localeCompare(b.country) ||
    a.name.localeCompare(b.name) ||
    a.url.localeCompare(b.url)
  );
}

function validationScore(source: CatalogSource) {
  let score = 0;

  if (source.bootstrapSource === "manual-verified-2026-05-17") {
    score += 120;
  }

  if (source.bootstrapSource === "active-2026-csv") {
    score += 90;
  }

  if (source.bootstrapStatus === "active") {
    score += 40;
  }

  if (source.sourceKind === "institution" || source.sourceKind === "public-media") {
    score += 5;
  }

  return score;
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }

    seen.add(value);
  }

  return Array.from(duplicates);
}
