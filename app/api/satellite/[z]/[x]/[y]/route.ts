import { NextResponse, type NextRequest } from "next/server";

type SatelliteTileParams = {
  z: string;
  x: string;
  y: string;
};

export const runtime = "nodejs";

let mapTilerBackoffUntil = 0;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<SatelliteTileParams> }
) {
  const apiKey =
    process.env.MAPTILER_API_KEY || process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing MAPTILER_API_KEY" },
      { status: 503 }
    );
  }

  const { z, x, y } = await context.params;
  const zoom = Number.parseInt(z, 10);
  const tileX = Number.parseInt(x, 10);
  const tileY = Number.parseInt(y, 10);

  if (
    !Number.isInteger(zoom) ||
    !Number.isInteger(tileX) ||
    !Number.isInteger(tileY) ||
    zoom < 0 ||
    zoom > 19
  ) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const tileCount = 2 ** zoom;

  if (tileY < 0 || tileY >= tileCount) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;

  if (Date.now() >= mapTilerBackoffUntil) {
    const upstreamUrl = new URL(
      `https://api.maptiler.com/maps/satellite-v4/${zoom}/${wrappedX}/${tileY}@2x.jpg`
    );
    upstreamUrl.searchParams.set("key", apiKey);

    const upstreamResponse = await fetch(upstreamUrl, {
      next: { revalidate: 60 * 60 * 24 * 7 }
    });

    if (upstreamResponse.ok) {
      return createTileResponse(upstreamResponse, "maptiler");
    }

    if (upstreamResponse.status !== 429) {
      return new NextResponse("Satellite tile unavailable", {
        status: upstreamResponse.status
      });
    }

    const retryAfter = Number.parseInt(
      upstreamResponse.headers.get("retry-after") ?? "",
      10
    );
    mapTilerBackoffUntil =
      Date.now() + (Number.isFinite(retryAfter) ? retryAfter * 1000 : 60_000);
  }

  const fallbackResponse = await fetch(
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${wrappedX}`,
    { next: { revalidate: 60 * 60 * 24 * 7 } }
  );

  if (!fallbackResponse.ok) {
    return new NextResponse("Satellite tile unavailable", {
      headers: { "Retry-After": "60" },
      status: fallbackResponse.status
    });
  }

  return createTileResponse(fallbackResponse, "world-imagery");
}

async function createTileResponse(response: Response, source: string) {
  const body = await response.arrayBuffer();
  const headers = new Headers({
    "Cache-Control":
      "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
    "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
    "X-Satellite-Source": source
  });

  return new NextResponse(body, { headers });
}
