# Madhurya Vastra

Inventory app (and, later, online store) for Madhurya Vastra, a women's ethnic-wear shop.
*Grace in Every Thread.*

Next.js 14 · TypeScript · Tailwind · PostgreSQL 16 · Drizzle · Docker

## Run it

Needs Docker. Nothing else has to be installed on your machine.

```bash
./scripts/dev-up.sh        # first run creates .env from .env.example, builds, migrates, seeds
```

Open http://localhost:3000 and sign in with phone **98765 43210** (or **owner@example.com**) and
password **madhurya-dev** — a development-only owner created on every start. Code changes reload
live. Lists (types, colours, occasions, tags) are seeded.

| Command | What it does |
|---|---|
| `./scripts/dev-up.sh` | Start Postgres + the app (migrate and seed on every start) |
| `./scripts/dev-down.sh` | Stop; data is kept |
| `./scripts/fresh.sh` | Wipe the database and photos, start clean (asks first) |
| `./scripts/db.sh migrate \| seed \| status \| shell` | Database tasks; `shell` opens psql |
| `./scripts/logs.sh [app\|db]` | Follow logs |
| `./scripts/check.sh [build]` | Type check + lint (+ production build) in the container |
| `./scripts/create-owner.sh --name "…" --phone …` | Create an owner (prints a temporary password) or `--reset-password` |

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

## Optional sign-in methods

**Google** (existing accounts only — the owner adds the person's email on the Staff screen first):
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google` (and the real domain later).
3. Put the ID and secret in `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, then
   `./scripts/dev-up.sh`. The "Continue with Google" button appears; with empty values it stays hidden.

**Sign-in codes by text message** ("Get a code by text message instead" on the login screen):
- Development: on by default — the code is printed in the app log (`./scripts/logs.sh app`, look
  for `[sms:dev]`).
- Production: set `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID` (an OTP template
  approved under TRAI DLT). Without them the option is hidden. Only phones that belong to an active
  staff account are ever texted.

## Changing the database

1. Edit `madhurya-vastra/db/schema.ts`.
2. `npm run db:generate -- --name what_changed` (in `madhurya-vastra/`) writes a SQL file to
   `db/migrations/`. Read it.
3. `./scripts/db.sh migrate` (or restart the stack). Never edit an applied migration.

Starter data lives in `db/seeds/*.sql` (safe to re-run); `db/seeds/dev/` is development only.
`npm run db:studio` opens Drizzle Studio to browse the data.

## Production image

`docker compose up -d --build` (without the dev file) builds a small standalone image that
applies pending migrations, then starts. It refuses to start without `BETTER_AUTH_SECRET`
(`openssl rand -base64 32`) and `BETTER_AUTH_URL` in `.env`. Create the first owner with
`docker compose exec app node scripts/create-owner.mjs --name "…" --phone …`. Seeds never run automatically. Item photos are on a
Docker volume for now; object storage (S3) comes before hosting — see `docs/roadmap.md`.

## Where things are

| Path | What |
|---|---|
| `madhurya-vastra/` | The Next.js app (`app/`, `components/ui/` shared kit, `lib/theme/` theme) |
| `madhurya-vastra/db/` | Drizzle schema, migrations, seeds |
| `docs/` | Brief, decisions, roadmap, theming, redesign plan and mock |
| `CLAUDE.md`, `.claude/` | Rules, skills and agents for Claude Code |
