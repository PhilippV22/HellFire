import globalRssSourcesRaw from "@/data/globalRssSources.json";

export type SourceKind =
  | "publisher"
  | "public-media"
  | "state-media"
  | "agency"
  | "institution";

export type GlobalRssSource = {
  id: string;
  name: string;
  url: string;
  country: string;
  countryCode: string;
  language: string;
  sourceKind: SourceKind;
  tags: string[];
  defaultCategoryHint: string;
  enabled: boolean;
  cadenceMinutes: number;
  bootstrapStatus: "active" | "unknown";
  bootstrapSource?: string;
};

export type SourceCoverageSummary = {
  enabledSources: number;
  enabledCountries: number;
  germanySources: number;
  conflictSources: number;
};

export const globalRssSources = globalRssSourcesRaw as GlobalRssSource[];

export const enabledGlobalRssSources = globalRssSources.filter(
  (source) => source.enabled
);

export const conflictTaggedRssSources = enabledGlobalRssSources.filter((source) =>
  source.tags.includes("conflict")
);

export const countryCoverage = Array.from(
  new Map(
    enabledGlobalRssSources
      .filter((source) => source.countryCode !== "GLOBAL")
      .map((source) => [
        source.countryCode,
        { country: source.country, countryCode: source.countryCode }
      ])
  ).values()
).sort((a, b) => a.country.localeCompare(b.country));

export function summarizeSourceCoverage(): SourceCoverageSummary {
  return {
    enabledSources: enabledGlobalRssSources.length,
    enabledCountries: countryCoverage.length,
    germanySources: enabledGlobalRssSources.filter(
      (source) => source.countryCode === "DEU"
    ).length,
    conflictSources: conflictTaggedRssSources.length
  };
}

export function sourceToRawSourceId(source: Pick<GlobalRssSource, "id">) {
  return `rss:${source.id}`;
}
