import { NextResponse } from "next/server";
import { updateEventAdmin } from "@/lib/server/osintRepository";
import { eventCategories, type EventCategory, type EventStatus } from "@/types/events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const statuses: EventStatus[] = ["unreviewed", "confirmed", "rejected", "archived"];

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const input = sanitizeBody(body);

  try {
    const event = await updateEventAdmin(id, input);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Admin update failed",
        detail: error instanceof Error ? error.message : "Database unavailable"
      },
      { status: 500 }
    );
  }
}

function sanitizeBody(body: unknown) {
  const record = isRecord(body) ? body : {};
  const status = statuses.includes(record.status as EventStatus)
    ? (record.status as EventStatus)
    : undefined;
  const category = eventCategories.includes(record.category as EventCategory)
    ? (record.category as EventCategory)
    : undefined;
  const confidence =
    typeof record.confidence === "number" && Number.isFinite(record.confidence)
      ? record.confidence
      : undefined;

  return { status, category, confidence };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
