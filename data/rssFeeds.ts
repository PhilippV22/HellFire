import { enabledGlobalRssSources } from "@/data/sourceCatalog";

export type RssFeedConfig = {
  id: string;
  name: string;
  url: string;
  defaultCategoryHint: string;
  sourceCountry?: string;
  sourceLanguage?: string;
};

export const publicCrisisRssFeeds: RssFeedConfig[] = enabledGlobalRssSources.map(
  (source) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    defaultCategoryHint: source.defaultCategoryHint,
    sourceCountry: source.country,
    sourceLanguage: source.language
  })
);
