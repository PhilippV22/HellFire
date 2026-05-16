import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/server/osintRepository";
import { getLiveEventDetail } from "@/lib/server/liveEvents";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const event = await getEventDetail(id);

    if (!event) {
      const liveEvent = await getLiveEventDetail(id);

      if (liveEvent) {
        return NextResponse.json({ data: liveEvent, source: "production-live" });
      }

      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ data: event, source: "production" });
  } catch (error) {
    const liveEvent = await getLiveEventDetail(id);

    if (liveEvent) {
      return NextResponse.json({
        data: liveEvent,
        source: "production-live",
        warning: error instanceof Error ? error.message : "Database unavailable"
      });
    }

    return NextResponse.json(
      {
        error: "Event detail unavailable",
        detail: error instanceof Error ? error.message : "Database unavailable"
      },
      { status: 503 }
    );
  }
}
