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

Current work: **UI redesign of everything built so far** — plan and progress in
[docs/redesign/](docs/redesign/README.md). Real authentication (Auth.js / better-auth) comes
**after** the redesign; do not touch auth during it.

Full brief: [docs/brief.md](docs/brief.md).

## Stack

| Layer | Tech |
|---|---|
| App | Next.js 14 (App Router) + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3 with brand tokens in `tailwind.config.ts` |
| Icons | `lucide-react` |
| Database | PostgreSQL via `pg` (raw parameterised SQL, `lib/db.ts`) |
| PWA | `next-pwa` (disabled in development) |
| Auth | Placeholder — dev bypass login only; Cognito code is a stub, to be replaced |

Planned, not installed yet — never import them until added on purpose: zod, Drizzle (migrations),
Vitest, Auth.js/better-auth, GSAP (redesign R1.7: intro animations only), Lenis/React Bits
(storefront only, phase 2).

Brand: logo violet `#6D37C0`, Indian-feel typography and logo motifs on every screen,
light + dark — see the `ui-kit` skill.

## Layout

```
Vastra_Inventory/            git root
  CLAUDE.md                  this file
  docs/                      brief, decisions, redesign plan, screens.pdf (UI baseline)
  assets/                    logo files
  .claude/                   rules, skills, agents, commands
  madhurya-vastra/           THE Next.js app — run every npm command from here
    app/(auth)/              login
    app/(protected)/         staff screens: inventory, items/new, manage-lists, sales, dashboard
    app/api/                 route handlers (items, lookups/*, auth/sync-user, seed, migrate, health)
    components/layout/       Header, Sidebar, BottomNav
    components/items/        Add Item parts: ImageUploader, VariantMatrix, ChipSelect, SearchableSelect
    components/lookups/      LookupList (Manage Lists)
    lib/theme/               theme config → CSS variables (colours, fonts, radius, motion)
    public/brand/            real logo, mark, vine, app icons (cut from assets/)
    context/ hooks/ lib/ types/
```

## Commands (run from `madhurya-vastra/`)

```bash
npm run dev            # http://localhost:3000 — needs DATABASE_URL in .env.local
npx tsc --noEmit       # type check — run after EVERY change
npm run lint           # eslint (next/core-web-vitals)
npm run build          # production build — run before calling a phase done
```

Dev data: `POST /api/seed` (lookups + seed owner), dev login via "Dev Bypass Login" on /login.

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

- **No schema in the repo.** Tables were created outside it; `/api/migrate` holds ad-hoc ALTERs.
  Planned: export schema → Drizzle migrations.
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
