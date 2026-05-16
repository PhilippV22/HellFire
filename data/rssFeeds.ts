export type RssFeedConfig = {
  id: string;
  name: string;
  url: string;
  defaultCategoryHint: string;
  sourceCountry?: string;
  sourceLanguage?: string;
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
  },
  {
    id: "tass-en",
    name: "TASS",
    url: "https://tass.com/rss/v2.xml",
    defaultCategoryHint: "world news crisis disaster protest conflict infrastructure",
    sourceCountry: "Russia",
    sourceLanguage: "en"
  },
  {
    id: "interfax-ru",
    name: "Interfax",
    url: "https://www.interfax.ru/rss.asp",
    defaultCategoryHint: "world news crisis disaster protest conflict infrastructure",
    sourceCountry: "Russia",
    sourceLanguage: "ru"
  },
  {
    id: "xinhua-world-en",
    name: "Xinhua World",
    url: "https://english.news.cn/rss/worldrss.xml",
    defaultCategoryHint: "world news crisis disaster protest conflict infrastructure",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "cgtn-world-en",
    name: "CGTN World",
    url: "https://www.cgtn.com/subscribe/rss/section/world.xml",
    defaultCategoryHint: "world news crisis disaster protest conflict infrastructure",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "china-daily-world-en",
    name: "China Daily World",
    url: "https://www.chinadaily.com.cn/rss/world_rss.xml",
    defaultCategoryHint: "world news crisis disaster protest conflict infrastructure",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "peoples-daily-world-en",
    name: "People's Daily Online World",
    url: "https://en.people.cn/rss/World.xml",
    defaultCategoryHint: "world news crisis disaster protest conflict infrastructure",
    sourceCountry: "China",
    sourceLanguage: "en"
  }
];
