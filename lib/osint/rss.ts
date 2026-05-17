import { XMLParser } from "fast-xml-parser";

export type ParsedRssItem = Record<string, unknown> & {
  feedId: string;
  feedName: string;
  categoryHint?: string;
  sourceCountry?: string;
  sourceLanguage?: string;
  feedUrl?: string;
};

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  textNodeName: "#text"
});

export function parseRssItems(
  xml: string,
  options: {
    feedId: string;
    feedName: string;
    categoryHint?: string;
    sourceCountry?: string;
    sourceLanguage?: string;
    feedUrl?: string;
  }
): ParsedRssItem[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = recordValue(parsed.rss);
  const channel = recordValue(rss?.channel);
  const rdf = recordValue(parsed["rdf:RDF"]);
  const atom = recordValue(parsed.feed);
  const items = channel
    ? toArray(channel.item)
    : rdf
      ? toArray(rdf.item)
      : atom
        ? toArray(atom.entry).map(normalizeAtomEntry)
        : [];

  return items.filter(isRecord).map((item) => ({
    ...item,
    feedId: options.feedId,
    feedName: options.feedName,
    categoryHint: options.categoryHint,
    sourceCountry: options.sourceCountry,
    sourceLanguage: options.sourceLanguage,
    feedUrl: options.feedUrl
  }));
}

function normalizeAtomEntry(entry: unknown) {
  if (!isRecord(entry)) {
    return entry;
  }

  const link = toArray(entry.link)
    .map((candidate) => {
      if (typeof candidate === "string") {
        return candidate;
      }

      const record = recordValue(candidate);

      return (
        stringValue(record?.["@_href"]) ||
        stringValue(record?.href) ||
        stringValue(record?.["#text"])
      );
    })
    .find(Boolean);

  return {
    ...entry,
    description: entry.summary || entry.content || entry.description,
    link,
    pubDate: entry.published || entry.updated || entry.pubDate
  };
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

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
