# HellFire

HellFire is a local civilian OSINT and crisis situation monitor MVP. It intentionally avoids military operational features, troop tracking, target tracking, or prediction workflows.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- MapLibre GL
- PostgreSQL and PostGIS preparation
- PostgreSQL/PostGIS local persistence
- GDELT, GDELT Doc, ReliefWeb, USGS, EMSC, GDACS, NASA EONET, and RSS production ingestion
- Three.js full-screen globe with local NASA Blue Marble satellite imagery
- Procedural rough-terrain overlays for dense forests, rivers, mountains, cliffs, and highlands

## Run

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.
Open `http://localhost:3000/admin` for the local admin surface.

Run the ingestion worker in a second terminal:

```bash
npm run worker
```

## VS Code Browser Tab

The workspace includes a Run and Debug configuration named `HellFire: VS Code Browser Tab`.
Start it with `F5` to launch the Next.js dev server and open `http://localhost:3000` inside a VS Code browser tab.

## Imagery

The 3D Earth uses a local NASA Blue Marble texture stored in `public/earth/land_ocean_ice_2048.jpg`.
Source and credit are documented in `public/earth/README.md`.

## Brand Assets

The extracted HellFire logo set is stored in `public/brand/hellfire/`:

- `logos/` for lockups, flame marks, badge, light/dark variations
- `app-icons/` for app icon variants
- `categories/` for incident, power, oil, hospital, bridge, rail, water, communication, and unverified icons
- `palette/` for the extracted color swatches
- `source/logo-set.png` for the original provided sheet

For house-level zoom, add a satellite XYZ tile source. MapTiler works out of the box through the local tile proxy when `MAPTILER_API_KEY` is set:

```bash
MAPTILER_API_KEY="your_key_here"
```

You can also provide any compatible XYZ satellite tile template:

```bash
NEXT_PUBLIC_SATELLITE_TILE_URL_TEMPLATE="https://example.com/tiles/{z}/{x}/{y}.jpg"
```

Without a tile key, the app keeps using the NASA overview texture plus procedural local detail overlays.
If MapTiler temporarily rate-limits the key during development, the local proxy falls back to World Imagery tiles so the globe can keep rendering.
Loaded satellite tiles are cached in memory on the globe and by the local proxy; the globe also prefetches the next zoom levels around the current focus.

## Local Data Pipeline

```bash
cp .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

The dashboard reads from PostgreSQL/PostGIS through local API routes. If the database is empty or unavailable, `/api/events` temporarily reads live production sources directly and caches them for 10 minutes. It never generates fake events.

To remove earlier generated demo reports/events from a local database:

```bash
npm run db:clear-mock-events
```

Environment variables:

```bash
DATABASE_URL="postgresql://hellfire:hellfire_dev_password@localhost:5432/hellfire"
GDELT_CLOUD_API_KEY=""
RELIEFWEB_APP_NAME="HellFire local crisis monitor"
MAPTILER_API_KEY=""
NEXT_PUBLIC_SATELLITE_TILE_URL_TEMPLATE=""
```

`.env.local` is ignored by Git, so local API keys stay out of commits.

API routes:

- `POST /api/ingest/gdelt`
- `POST /api/ingest/gdelt-doc`
- `POST /api/ingest/reliefweb`
- `POST /api/ingest/usgs`
- `POST /api/ingest/emsc`
- `POST /api/ingest/gdacs`
- `POST /api/ingest/eonet`
- `POST /api/ingest/rss`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/infrastructure`
- `GET /api/timeline`
- `GET /api/admin/raw-reports`
- `PATCH /api/admin/events/:id`

Worker cadence:

- GDELT every 15 minutes
- GDELT Doc every 15 minutes
- ReliefWeb every 30 minutes
- USGS and EMSC every 10 minutes
- GDACS every 15 minutes
- EONET and RSS every 30 minutes

Source references: [GDELT Cloud API v2](https://docs.gdeltcloud.com/api-reference/v2), [NASA EONET](https://eonet.gsfc.nasa.gov/docs/v3), [GDACS RSS](https://www.gdacs.org/feed_reference.aspx), [EMSC SeismicPortal](https://www.seismicportal.eu/fdsn-wsevent.html), [ReliefWeb API](https://apidoc.reliefweb.int/endpoints), [USGS GeoJSON feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php), [CDC RSS](https://wwwnc.cdc.gov/travel/page/rss).
