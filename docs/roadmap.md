# Roadmap

Each step needs its own brief and plan (`/new-feature`) when its turn comes. Keep this list
short and current.

## Phase 1 order (agreed with the owner, 2026-10-18)

Done: UI redesign (R0–R6), real authentication (A1–A6), inventory list (step 1).

1. ~~**Inventory list**~~ — done 2026-10-18 ([plans/inventory-list.md](plans/inventory-list.md)).
2. **Item detail / edit** — `/items/[id]`: view an item and change it. ← *current step*
   (`/items/[id]` is a placeholder today; cards on /inventory already link to it.)
   Rule: a one-of-a-kind item (`items.is_one_of_a_kind`) can't gain sizes or colours until the
   flag is turned off, and turning it off is an explicit action in the edit UI (never a side
   effect of adding a size or colour). The server enforces it too.
3. **Caption templates + sharing** — build a caption from the item (`items.caption_text`) and
   share photos + caption to **WhatsApp and Instagram**. **Mandatory in phase 1.**
4. **Set up CI** — GitHub Actions on every pull request and push to `main`: lint, typecheck
   (`tsc --noEmit`), tests (`npm test`, plus the Postgres tests in a `postgres:16` service with
   `TEST_DATABASE_URL`) and `npm run build`. Branch protection: `main` merges only when it is
   green. Needed before hosting, so nothing broken gets deployed. (Not built yet.)
5. **S3 photo storage + hosting** — one storage helper (local disk in development, S3 in
   production), then host the app (see "Hosting" below).
6. **Stock-movement ledger** — purchase, sale, return, adjustment recorded as rows; current
   quantity derived (see [decisions](decisions/README.md)).
7. **Mark as sold** — record a sale against a variant through the ledger.
8. **Dashboard + activity log** — the dashboard below, plus a screen over `activity_log`.

## Dashboard (step 8 — after mark as sold holds real data)

The `/dashboard` screen is a placeholder until there is data worth summarising. First version:
- Today's sales (count, ₹ total) and this month vs last month.
- Items running low: variants at or below a reorder level.
- Best sellers this month by item type, occasion and colour.
- Stock value at cost (owner only).

Code marker: `app/(protected)/dashboard/page.tsx` (TODO(roadmap) comment).

## Admin theming (not scheduled — its prerequisites, redesign and real auth, are done)

The owner/admin can change the look without a developer:
- **Theme presets**: switch palette, font set and motion from an admin screen.
- **Festival themes**: e.g. Diwali (warm gold, diya motif), Holi (playful accents), Navratri
  (nine-colour accents), Eid, Christmas, wedding season — scheduled by date range, falling back to
  the default theme when it ends.
- **Font sets** from a curated list (no free upload).
- **Motion**: choose the intro (logo bloom, none) and festival effects; always off for
  reduced-motion users.

Groundwork already in place: every colour, font role, radius and motion value is a theme token
generated from a typed `ThemeConfig` in `madhurya-vastra/lib/theme/` — see
[theming.md](theming.md). Later work: store `ThemeConfig` in the database, an admin editor with
live preview and contrast checks, and a schedule table for festival themes.

## Others already noted
- Inventory search by colour and item type (follow-up to step 1, which searches titles only).
- ~~Real authentication~~ — done 2026-10-18 (better-auth, docs/plans/auth.md).
- SKU / barcode per variant (after the stock ledger).
- Hosting (step 5): AWS (App Runner/ECS + RDS + S3, using the Docker image) or Vercel
  (+ Neon/RDS + S3) — still to decide.
- Customer storefront + payments (phase 2) — see [decisions](decisions/README.md).
