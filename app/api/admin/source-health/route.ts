import { NextResponse } from "next/server";
import {
  enabledGlobalRssSources,
  summarizeSourceCoverage
} from "@/data/sourceCatalog";
import { listSourceHealth } from "@/lib/server/osintRepository";

export async function GET() {
  try {
    return NextResponse.json({
      data: await listSourceHealth(),
      source: "db"
    });
  } catch (error) {
    return NextResponse.json({
      data: {
        coverage: summarizeSourceCoverage(),
        sources: enabledGlobalRssSources.slice(0, 1000).map((source) => ({
          id: `rss:${source.id}`,
          name: source.name,
          sourceType: "rss",
          url: source.url,
          enabled: source.enabled,
          cadenceMinutes: source.cadenceMinutes,
          country: source.country,
          language: source.language,
          tags: source.tags,
          failureCount: 0
        }))
      },
      source: "catalog",
      warning: error instanceof Error ? error.message : "Database unavailable"
    });
  }
}
