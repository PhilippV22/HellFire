import { NextResponse } from "next/server";
import { listInfrastructure } from "@/lib/server/osintRepository";

export async function GET() {
  try {
    return NextResponse.json({
      data: await listInfrastructure(),
      source: "production"
    });
  } catch (error) {
    return NextResponse.json({
      data: [],
      source: "production",
      warning: error instanceof Error ? error.message : "Database unavailable"
    });
  }
}
