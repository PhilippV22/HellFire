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
    id: "interfax-ru",
    name: "Interfax",
    url: "https://www.interfax.ru/rss.asp",
    sourceCountry: "Russia",
    sourceLanguage: "ru"
  },
  {
    id: "rbc-ru",
    name: "RBC Russia",
    url: "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
    sourceCountry: "Russia",
    sourceLanguage: "ru"
  },
  {
    id: "lenta-ru",
    name: "Lenta.ru",
    url: "https://lenta.ru/rss/news",
    sourceCountry: "Russia",
    sourceLanguage: "ru"
  },
  {
    id: "kommersant-ru",
    name: "Kommersant",
    url: "https://www.kommersant.ru/rss/news.xml",
    sourceCountry: "Russia",
    sourceLanguage: "ru"
  },
  {
    id: "moscow-times-en",
    name: "The Moscow Times",
    url: "https://www.themoscowtimes.com/rss/news",
    sourceCountry: "Russia",
    sourceLanguage: "en"
  },
  {
    id: "sputnik-en",
    name: "Sputnik",
    url: "https://sputnikglobe.com/export/rss2/archive/index.xml",
    sourceCountry: "Russia",
    sourceLanguage: "en"
  },
  {
    id: "mediazona-ru",
    name: "Mediazona",
    url: "https://zona.media/rss",
    sourceCountry: "Russia",
    sourceLanguage: "ru"
  },
  {
    id: "xinhua-world-en",
    name: "Xinhua World",
    url: "https://english.news.cn/rss/worldrss.xml",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "cgtn-world-en",
    name: "CGTN World",
    url: "https://www.cgtn.com/subscribe/rss/section/world.xml",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "china-daily-world-en",
    name: "China Daily World",
    url: "https://www.chinadaily.com.cn/rss/world_rss.xml",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "peoples-daily-world-en",
    name: "People's Daily Online World",
    url: "https://en.people.cn/rss/World.xml",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "global-times-en",
    name: "Global Times",
    url: "https://www.globaltimes.cn/rss/outbrain.xml",
    sourceCountry: "China",
    sourceLanguage: "en"
  },
  {
    id: "scmp-world-en",
    name: "South China Morning Post World",
    url: "https://www.scmp.com/rss/91/feed",
    sourceCountry: "China",
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
    id: "kyiv-independent-en",
    name: "The Kyiv Independent",
    url: "https://kyivindependent.com/news-archive/rss/",
    sourceCountry: "Ukraine",
    sourceLanguage: "en"
  },
  {
    id: "euromaidan-press-en",
    name: "Euromaidan Press",
    url: "https://euromaidanpress.com/feed/",
    sourceCountry: "Ukraine",
    sourceLanguage: "en"
  },
  {
    id: "new-voice-en",
    name: "The New Voice of Ukraine",
    url: "https://english.nv.ua/rss/all_english.xml",
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
    id: "pravda-ua",
    name: "Ukrainska Pravda Ukrainian",
    url: "https://www.pravda.com.ua/rss/",
    sourceCountry: "Ukraine",
    sourceLanguage: "uk"
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
  /(war|krieg|guerre|войн|конфликт|украин|росси|киев|київ|донецк|донецьк|луган|запорож|херсон|харьков|харків|крым|крим|фронт|наступ|оккупац|окупац|удар|обстрел|ракета|дрон|эвакуац|беженц|санкц|війна|конфлікт|обстріл|ракета|дрон|евакуац|біженц|conflict|combat|clash|ceasefire|invasion|occupation|airstrike|strike|shelling|missile|rocket|drone|hostage|frontline|front line|offensive|counteroffensive|evacuation|refugee|sanction|ukraine|ukrainian|russia|russian|kyiv|kiev|dnipro|donetsk|luhansk|zaporizhzhia|zaporizhia|kherson|kharkiv|crimea|pokrovsk|gaza|hamas|hezbollah|west bank|战争|戰爭|冲突|衝突|袭击|襲擊|导弹|導彈|无人机|無人機|停火|入侵|占领|佔領|撤离|撤離|难民|難民|制裁|加沙|乌克兰|烏克蘭|俄罗斯|俄羅斯|以色列|巴勒斯坦)/i;
