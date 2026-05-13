import { XMLParser } from "fast-xml-parser";

export type ParsedRssItem = Record<string, unknown> & {
  feedId: string;
  feedName: string;
  categoryHint?: string;
};

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  textNodeName: "#text"
});

export function parseRssItems(
  xml: string,
  options: { feedId: string; feedName: string; categoryHint?: string }
): ParsedRssItem[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = recordValue(parsed.rss);
  const channel = recordValue(rss?.channel);
  const items = toArray(channel?.item);

  return items.filter(isRecord).map((item) => ({
    ...item,
    feedId: options.feedId,
    feedName: options.feedName,
    categoryHint: options.categoryHint
  }));
}

function toArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function recordValue(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
