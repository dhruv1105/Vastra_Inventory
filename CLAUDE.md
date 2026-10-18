# Madhurya Vastra — Claude Code instructions

Read this file fully before writing code. It is short on purpose; detail lives in the skills
listed at the bottom. When this file and the code disagree, the code wins — say so and ask.

## What this app is

Inventory and (later) online store for **Madhurya Vastra**, one women's ethnic-wear shop
(sarees, kurtis, lehengas, suit sets…). Tagline: *Grace in Every Thread*.

| Phase | Who uses it | Scope |
|---|---|---|
| **1 — now** | Owner and sellers (staff), mostly on phones in the shop | Add/edit items, stock, lists, sales, dashboard |
| **2 — later** | Customers, on web and phone | Storefront, cart, orders, online payment |

The UI redesign (R0–R6) is done: every screen uses the shared kit in `components/ui/` — see
[docs/redesign/](docs/redesign/README.md) and the screen catalogue [docs/screens.pdf](docs/screens.pdf).
Next, per the roadmap: real authentication (Auth.js / better-auth), then the inventory list.

Full brief: [docs/brief.md](docs/brief.md).

## Stack

| Layer | Tech |
|---|---|
| App | Next.js 14 (App Router) + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3 with brand tokens in `tailwind.config.ts` |
| Icons | `lucide-react` |
| Database | PostgreSQL 16 in Docker; schema + migrations with **Drizzle** (`db/schema.ts`); existing routes use raw parameterised SQL via `query()`, new code may use the typed `db` client (`lib/db.ts`) |
| Dev stack | Docker Compose (`docker-compose.yml` + `docker-compose.dev.yml`), helper scripts in `scripts/` |
| PWA | `next-pwa` (disabled in development) |
| Auth | Placeholder — dev bypass login only; Cognito code is a stub, to be replaced |

Installed on purpose: GSAP (intro only, loaded lazily), Drizzle ORM + drizzle-kit.
Planned, not installed yet — never import them until added on purpose: zod, Vitest,
Auth.js/better-auth, Lenis/React Bits (storefront only, phase 2).

Brand: logo violet `#6D37C0`, Indian-feel typography and logo motifs on every screen,
light + dark — see the `ui-kit` skill.

## Layout

```
Vastra_Inventory/            git root
  CLAUDE.md                  this file
  docs/                      brief, decisions, roadmap, theming, redesign plan + mock, screens.pdf
  scripts/                   dev-up, dev-down, fresh, db, logs, check (Docker dev stack)
  docker-compose*.yml        base stack + dev overlay; settings in .env (see .env.example)
  assets/                    logo files
  .claude/                   rules, skills, agents, commands
  madhurya-vastra/           THE Next.js app — run every npm command from here
    app/(auth)/              login
    app/(protected)/         staff screens: inventory, items/new, manage-lists, sales, dashboard
    app/api/                 route handlers (items, lookups/*, auth/sync-user, health)
    app/kit/                 dev-only preview of the shared kit (404 in production)
    db/                      Drizzle schema.ts, generated migrations/, re-runnable SQL seeds/
    scripts/db.mjs           migrate | seed | status (used by Docker and npm db:* scripts)
    components/layout/       Header, Sidebar, BottomNav
    components/items/        Add Item parts: ImageUploader, VariantMatrix, ChipSelect, SearchableSelect
    components/lookups/      LookupList (Manage Lists)
    lib/theme/               theme config → CSS variables (colours, fonts, radius, motion)
    public/brand/            real logo, mark, vine, app icons (cut from assets/)
    context/ hooks/ lib/ types/
```

## Commands

Always use the Docker dev stack (from the repo root) — don't start separate Postgres or Node
servers; they won't share the `vastra_db-data` volume.

```bash
./scripts/dev-up.sh          # Postgres + app on http://localhost:3000; migrate + seed on start
./scripts/dev-down.sh        # stop, keep data      ./scripts/fresh.sh   wipe + restart (asks)
./scripts/db.sh migrate|seed|status|shell
./scripts/logs.sh app
./scripts/check.sh [build]   # tsc + lint (+ build) inside the container
```

From `madhurya-vastra/` (host node_modules installed):

```bash
npx tsc --noEmit       # type check — run after EVERY change
npm run lint           # eslint (next/core-web-vitals)
npm run build          # production build — run before calling a phase done
npm run db:generate -- --name <change>   # after editing db/schema.ts; review the SQL
```

Dev login: "Dev Bypass Login" on /login (the seeded owner). Login is held in memory only — a
full page reload signs out until real auth lands; navigate inside the app when testing.

## Top rules (full list: [.claude/rules.md](.claude/rules.md))

1. **Plan before build.** Non-trivial work: written plan → user approval → build, one step per commit.
2. **Type check after every change** (`npx tsc --noEmit`); fix errors before moving on.
3. **Brand tokens only.** No raw hex, no `gray-*`/`red-*` palette classes, no `rounded-[12px]` —
   use the tokens, motifs and shared kit (`ui-kit` skill). Works in light and dark.
4. **Reuse before building.** Search `components/` first. Same thing → same component, same word.
5. **Phone first.** Every screen works at 390×844, 844×390, 768×1024 and 1366×768 with no
   horizontal scroll.
6. **Validate on the server.** Client checks are convenience; every route validates its input.
7. **Money is exact.** Rupees shown as `₹1,999`; never float arithmetic on prices.
8. **Stay in scope.** A redesign task changes UI only; any API/DB change is asked first and
   listed in the summary.
9. **No secrets in code or logs.** `.env*` files are never read, printed or committed.
10. **Commit messages say why**, not "fixes".

@.claude/rules.md

## Known gaps (do not "fix" silently — they have their own planned steps)

- **Photos on local disk** (`public/uploads`, a Docker volume). Planned: one storage helper —
  disk in development, S3 in production — before hosting.
- **No server-side auth.** Routes trust `userId` from the request body; `sync-user` creates
  every new user as `owner`. Planned: Auth.js/better-auth after the redesign.
- **Stock is a mutable `variants.quantity`.** Planned: stock-movement ledger before Sales.
- No tests yet (Vitest planned).

## Vocabulary

| Term | Meaning |
|---|---|
| Item | One product, e.g. "Lavender Georgette Saree" (`items` table) |
| Variant | One size × colour of an item, with its own quantity and optional price override |
| Wear type | Top / Bottom / Top + Bottom (`wear_type`: `top`/`bottom`/`both`) |
| Lists / lookups | Item Types, Colors, Occasions, Tags — edited on Manage Lists |
| Draft | Item saved but not yet live in inventory (`status = 'draft'`) |
| Owner / Seller | The two staff roles |
| One-of-a-kind | Item with no variants (single piece) |

## Skills — load the ones your task needs

| Skill | Load when |
|---|---|
| `ui-kit` | Any change to a screen, component or style |
| `redesign-method` | Working on the UI redesign (any `docs/redesign/` step) |
| `vastra-domain` | Anything touching items, variants, lists, stock, prices |
| `api-route` | Writing or changing anything under `app/api/` |

Subagents in `.claude/agents/`: `checker` (type check/lint/build, reports failures),
`code-scout` (read-only search), `ui-snapshot` (screenshots at the 4 device sizes). Use them
for that legwork; keep design and judgment in the main session.
