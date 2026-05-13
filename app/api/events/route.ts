import { NextResponse } from "next/server";
import { listEvents } from "@/lib/server/osintRepository";
import { getLiveProductionEvents } from "@/lib/server/liveEvents";
import { eventCategories, type EventCategory, type EventFilters } from "@/types/events";

export async function GET(request: Request) {
  const filters = parseFilters(new URL(request.url));

  try {
    const events = await listEvents(filters, {
      includeRejected: new URL(request.url).searchParams.get("includeRejected") === "1"
    });

    if (events.length > 0) {
      return NextResponse.json({
        data: events,
        source: "production"
      });
    }

    const live = await getLiveProductionEvents();

    return NextResponse.json({
      data: filterLiveEvents(live.events, filters),
      source: "production-live",
      warning: live.warnings.join(" | ")
    });
  } catch (error) {
    const live = await getLiveProductionEvents();

    return NextResponse.json({
      data: filterLiveEvents(live.events, filters),
      source: "production-live",
      warning: [
        error instanceof Error ? error.message : "Database unavailable",
        ...live.warnings
      ]
        .filter(Boolean)
        .join(" | ")
    });
  }
}

function parseFilters(url: URL): Partial<EventFilters> {
  const categories = url.searchParams
    .get("categories")
    ?.split(",")
    .filter((item): item is EventCategory =>
      eventCategories.includes(item as EventCategory)
    );

  return {
    categories,
    minSeverity: numericParam(url, "minSeverity"),
    minConfidence: numericParam(url, "minConfidence"),
    country: url.searchParams.get("country") || undefined,
    region: url.searchParams.get("region") || undefined
  };
}

function numericParam(url: URL, key: string) {
  const raw = url.searchParams.get(key);

  if (!raw) {
    return undefined;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : undefined;
}

function filterLiveEvents(
  events: Awaited<ReturnType<typeof getLiveProductionEvents>>["events"],
  filters: Partial<EventFilters>
) {
  return events.filter((event) => {
    return (
      (!filters.categories?.length || filters.categories.includes(event.category)) &&
      (!filters.minSeverity || event.severity >= filters.minSeverity) &&
      (!filters.minConfidence || event.confidence >= filters.minConfidence) &&
      (!filters.country || event.country === filters.country) &&
      (!filters.region ||
        event.region === filters.region ||
        event.locationName.toLowerCase().includes(filters.region.toLowerCase()))
    );
  });
}
