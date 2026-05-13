import { NextResponse } from "next/server";
import { ingestSource } from "@/lib/osint/ingest";

export async function GET() {
  return run();
}

export async function POST() {
  return run();
}

async function run() {
  try {
    return NextResponse.json(await ingestSource("gdelt-doc"));
  } catch (error) {
    return NextResponse.json(
      { error: "GDELT Doc ingestion failed", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
