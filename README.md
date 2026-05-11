# HellFire

HellFire is a civilian crisis situation monitor MVP. It starts with mock data only and intentionally avoids military operational features, troop tracking, target tracking, or prediction workflows.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- MapLibre GL
- PostgreSQL and PostGIS preparation
- Mock data first
- Three.js full-screen globe with local NASA Blue Marble satellite imagery
- Mock rough-terrain overlays for dense forests, rivers, mountains, cliffs, and highlands

## Run

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm install
npm run dev
```

Open `http://localhost:3000`.

## VS Code Browser Tab

The workspace includes a Run and Debug configuration named `HellFire: VS Code Browser Tab`.
Start it with `F5` to launch the Next.js dev server and open `http://localhost:3000` inside a VS Code browser tab.

## Imagery

The 3D Earth uses a local NASA Blue Marble texture stored in `public/earth/land_ocean_ice_2048.jpg`.
Source and credit are documented in `public/earth/README.md`.

## Optional PostGIS

```bash
cp .env.example .env
docker compose up -d postgres
```

The current MVP does not read from the database yet. The schema is prepared in `database/init/001_schema.sql` for a later persistence layer.
