export type ConflictNewsFeedConfig = {
  id: string;
  name: string;
  url: string;
  sourceCountry: string;
  sourceLanguage: string;
};

export const conflictNewsFeeds: ConflictNewsFeedConfig[] = [
  {
    id: "tass-en",
    name: "TASS",
    url: "https://tass.com/rss/v2.xml",
    sourceCountry: "Russia",
    sourceLanguage: "en"
  },
  {
    id: "meduza-en",
    name: "Meduza",
    url: "https://meduza.io/rss/en/all",
    sourceCountry: "Russia",
    sourceLanguage: "en"
  },
  {
    id: "rt-en",
    name: "RT",
    url: "https://www.rt.com/rss/",
    sourceCountry: "Russia",
    sourceLanguage: "en"
  },
  {
    id: "ukrinform-en",
    name: "Ukrinform",
    url: "https://www.ukrinform.net/rss/block-lastnews",
    sourceCountry: "Ukraine",
    sourceLanguage: "en"
  },
  {
    id: "pravda-en",
    name: "Ukrainska Pravda",
    url: "https://www.pravda.com.ua/eng/rss/",
    sourceCountry: "Ukraine",
    sourceLanguage: "en"
  },
  {
    id: "jpost-en",
    name: "The Jerusalem Post",
    url: "https://www.jpost.com/Rss/RssFeedsHeadlines.aspx",
    sourceCountry: "Israel",
    sourceLanguage: "en"
  },
  {
    id: "npr-world",
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml",
    sourceCountry: "United States",
    sourceLanguage: "en"
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    sourceCountry: "United Kingdom",
    sourceLanguage: "en"
  },
  {
    id: "dw-world",
    name: "Deutsche Welle",
    url: "https://rss.dw.com/rdf/rss-en-all",
    sourceCountry: "Germany",
    sourceLanguage: "en"
  },
  {
    id: "france24-world",
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    sourceCountry: "France",
    sourceLanguage: "en"
  },
  {
    id: "aljazeera-all",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    sourceCountry: "Qatar",
    sourceLanguage: "en"
  },
  {
    id: "guardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    sourceCountry: "United Kingdom",
    sourceLanguage: "en"
  },
  {
    id: "nhk-japan",
    name: "NHK News",
    url: "https://www3.nhk.or.jp/rss/news/cat0.xml",
    sourceCountry: "Japan",
    sourceLanguage: "ja"
  }
];

export const conflictKeywordPattern =
  /\b(war|krieg|guerre|войн|війна|conflict|combat|clash|ceasefire|invasion|occupation|airstrike|strike|shelling|missile|rocket|drone|hostage|frontline|offensive|counteroffensive|evacuation|refugee|sanction|gaza|hamas|hezbollah|donetsk|kharkiv|crimea|west bank)\b/i;
