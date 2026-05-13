export type RssFeedConfig = {
  id: string;
  name: string;
  url: string;
  defaultCategoryHint: string;
};

export const publicCrisisRssFeeds: RssFeedConfig[] = [
  {
    id: "cdc-travel-notices",
    name: "CDC Travel Health Notices",
    url: "https://wwwnc.cdc.gov/travel/rss/notices.xml",
    defaultCategoryHint: "health outbreak travel notice"
  },
  {
    id: "un-news",
    name: "UN News",
    url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    defaultCategoryHint: "humanitarian disaster conflict protest health"
  },
  {
    id: "bbc-world",
    name: "BBC World RSS",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    defaultCategoryHint: "world news crisis disaster protest conflict"
  }
];
