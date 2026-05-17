import { conflictTaggedRssSources } from "@/data/sourceCatalog";

export type ConflictNewsFeedConfig = {
  id: string;
  name: string;
  url: string;
  sourceCountry: string;
  sourceLanguage: string;
};

export const conflictNewsFeeds: ConflictNewsFeedConfig[] =
  conflictTaggedRssSources.map((source) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    sourceCountry: source.country,
    sourceLanguage: source.language
  }));

export const conflictKeywordPattern =
  /(war|krieg|guerre|войн|конфликт|украин|росси|киев|київ|донецк|донецьк|луган|запорож|херсон|харьков|харків|крым|крим|фронт|наступ|оккупац|окупац|удар|обстрел|ракета|дрон|эвакуац|беженц|санкц|війна|конфлікт|обстріл|ракета|дрон|евакуац|біженц|conflict|combat|clash|ceasefire|invasion|occupation|airstrike|strike|shelling|missile|rocket|drone|hostage|frontline|front line|offensive|counteroffensive|evacuation|refugee|sanction|ukraine|ukrainian|russia|russian|kyiv|kiev|dnipro|donetsk|luhansk|zaporizhzhia|zaporizhia|kherson|kharkiv|crimea|pokrovsk|gaza|hamas|hezbollah|west bank|战争|戰爭|冲突|衝突|袭击|襲擊|导弹|導彈|无人机|無人機|停火|入侵|占领|佔領|撤离|撤離|难民|難民|制裁|加沙|乌克兰|烏克蘭|俄罗斯|俄羅斯|以色列|巴勒斯坦)/i;
