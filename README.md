# HellFire

HellFire is a civilian crisis situation monitor MVP. It starts with mock data only and intentionally avoids military operational features, troop tracking, target tracking, or prediction workflows.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- MapLibre GL
- PostgreSQL and PostGIS preparation
- Mock data first

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

## Optional PostGIS

```bash
cp .env.example .env
docker compose up -d postgres
```

The current MVP does not read from the database yet. The schema is prepared in `database/init/001_schema.sql` for a later persistence layer.
