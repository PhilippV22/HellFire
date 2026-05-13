import { NextResponse } from "next/server";
import { getLiveProductionEvents } from "@/lib/server/liveEvents";
import { listTimeline } from "@/lib/server/osintRepository";
import type { TimelineBucket } from "@/types/events";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = {
    country: url.searchParams.get("country") || undefined,
    region: url.searchParams.get("region") || undefined
  };

  try {
    const timeline = await listTimeline(filters);

    if (timeline.length > 0) {
      return NextResponse.json({
        data: timeline,
        source: "production"
      });
    }

    const live = await getLiveProductionEvents();

    return NextResponse.json({
      data: liveTimeline(live.events),
      source: "production-live",
      warning: live.warnings.join(" | ")
    });
  } catch (error) {
    const live = await getLiveProductionEvents();

    return NextResponse.json({
      data: liveTimeline(live.events),
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

function liveTimeline(
  events: Awaited<ReturnType<typeof getLiveProductionEvents>>["events"]
): TimelineBucket[] {
  const buckets = new Map<string, TimelineBucket>();

  for (const event of events) {
    const day = event.eventTime.slice(0, 10);
    const key = `${day}:${event.category}:${event.country ?? ""}:${event.region ?? ""}`;
    const current = buckets.get(key);

    if (current) {
      current.count += 1;
      current.maxSeverity = Math.max(current.maxSeverity, event.severity);
      continue;
    }

    buckets.set(key, {
      day,
      category: event.category,
      country: event.country,
      region: event.region,
      count: 1,
      maxSeverity: event.severity
    });
  }

  return Array.from(buckets.values()).sort((a, b) => b.day.localeCompare(a.day));
}
