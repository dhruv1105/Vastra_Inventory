# Madhurya Vastra

Inventory app (and, later, online store) for Madhurya Vastra, a women's ethnic-wear shop.
*Grace in Every Thread.*

Next.js 14 · TypeScript · Tailwind · PostgreSQL 16 · Drizzle · Docker

## Run it

Needs Docker. Nothing else has to be installed on your machine.

```bash
./scripts/dev-up.sh        # first run creates .env from .env.example, builds, migrates, seeds
```

Open http://localhost:3000 and use **Dev Bypass Login** (development only). Code changes reload
live. Lists (types, colours, occasions, tags) and a test owner are seeded.

| Command | What it does |
|---|---|
| `./scripts/dev-up.sh` | Start Postgres + the app (migrate and seed on every start) |
| `./scripts/dev-down.sh` | Stop; data is kept |
| `./scripts/fresh.sh` | Wipe the database and photos, start clean (asks first) |
| `./scripts/db.sh migrate \| seed \| status \| shell` | Database tasks; `shell` opens psql |
| `./scripts/logs.sh [app\|db]` | Follow logs |
| `./scripts/check.sh [build]` | Type check + lint (+ production build) in the container |

Ports: app `3000`, Postgres `127.0.0.1:5440` (change `APP_PORT` / `DB_PORT` in `.env`).

### Without Docker for the app

Keep the database in Docker, run Next.js on your machine:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
cd madhurya-vastra
cp .env.example .env.local
npm install
npm run db:migrate && npm run db:seed:dev
npm run dev
```

## Changing the database

1. Edit `madhurya-vastra/db/schema.ts`.
2. `npm run db:generate -- --name what_changed` (in `madhurya-vastra/`) writes a SQL file to
   `db/migrations/`. Read it.
3. `./scripts/db.sh migrate` (or restart the stack). Never edit an applied migration.

Starter data lives in `db/seeds/*.sql` (safe to re-run); `db/seeds/dev/` is development only.
`npm run db:studio` opens Drizzle Studio to browse the data.

## Production image

`docker compose up -d --build` (without the dev file) builds a small standalone image that
applies pending migrations, then starts. Seeds never run automatically. Item photos are on a
Docker volume for now; object storage (S3) comes before hosting — see `docs/roadmap.md`.

## Where things are

| Path | What |
|---|---|
| `madhurya-vastra/` | The Next.js app (`app/`, `components/ui/` shared kit, `lib/theme/` theme) |
| `madhurya-vastra/db/` | Drizzle schema, migrations, seeds |
| `docs/` | Brief, decisions, roadmap, theming, redesign plan and mock |
| `CLAUDE.md`, `.claude/` | Rules, skills and agents for Claude Code |
