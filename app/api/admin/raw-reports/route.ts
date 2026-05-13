import { NextResponse } from "next/server";
import { listRawReports } from "@/lib/server/osintRepository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 120);

  try {
    return NextResponse.json({
      data: await listRawReports(Number.isFinite(limit) ? limit : 120),
      source: "db"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Raw reports unavailable",
        detail: error instanceof Error ? error.message : "Database unavailable"
      },
      { status: 503 }
    );
  }
}
