# Roadmap

Each step needs its own brief and plan (`/new-feature`) when its turn comes. Keep this list
short and current.

## Phase 1 order (agreed with the owner, 2026-10-18)

Done: UI redesign (R0–R6), real authentication (A1–A6), inventory list (step 1), item detail +
edit (step 2).

1. ~~**Inventory list**~~ — done 2026-10-18 ([plans/inventory-list.md](plans/inventory-list.md)).
2. ~~**Item detail / edit**~~ — done 2026-11-05 ([plans/item-detail.md](plans/item-detail.md)):
   `/items/[id]` and `/items/[id]/edit`, publish / archive / restore / delete, concurrency check,
   history in `activity_log`, colour combinations and colours in the design.
3. **Caption templates + sharing** — build a caption from the item (`items.caption_text`) and
   share photos + caption to **WhatsApp and Instagram**. **Mandatory in phase 1.** ← *current step*
   (The item page already shows a disabled Share button waiting for it.) Uses the phone's share
   menu only — no Meta API (decided 2026-11-05; see step 6).
4. **Set up CI** — GitHub Actions on every pull request and push to `main`: lint, typecheck
   (`tsc --noEmit`), tests (`npm test`, plus the Postgres tests in a `postgres:16` service with
   `TEST_DATABASE_URL`) and `npm run build`. Branch protection: `main` merges only when it is
   green. Needed before hosting, so nothing broken gets deployed. (Not built yet.)
5. **S3 photo storage + hosting** — one storage helper (local disk in development, S3 in
   production), then host the app (see "Hosting" below). Includes **cleaning up orphaned photo
   files**: removed photos are soft-deleted rows whose files stay on disk (item edit, 2026-10-18).
6. **Meta integrations (Instagram + WhatsApp)** — after hosting, because Instagram's API only
   takes photos at a public HTTPS address. Each part gets its own brief and plan; options,
   prerequisites and costs researched in [plans/sharing.md](plans/sharing.md#later-meta-integrations-own-roadmap-step-after-hosting).
   1. **Instagram post from the app** — item photos (carousel) + caption posted to
      @madhuryavastra in one tap. Needs a Business/Creator account and a Meta app (Instagram
      Login). Free.
   2. **Comment → automatic DM** — a customer comments "price" on a post and gets the item's
      details by DM. Needs Meta's messaging permission (app review). Free.
   3. **WhatsApp Business catalogue** — items synced to the shop's WhatsApp catalogue. Free.
   4. **WhatsApp Business API** (broadcasts to opted-in customers, order updates) — paid per
      message and needs a customer list, so it moves to phase 2 with customers and orders.
   Before starting: confirm the Instagram account is Business/Creator and which WhatsApp app the
   shop uses.
7. **Stock-movement ledger** — purchase, sale, return, adjustment recorded as rows; current
   quantity derived (see [decisions](decisions/README.md)).
8. **Mark as sold** — record a sale against a variant through the ledger.
9. **Dashboard + activity log** — the dashboard below, plus a screen over `activity_log`.

## Dashboard (step 9 — after mark as sold holds real data)

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
- Customer storefront + payments (phase 2) — see [decisions](decisions/README.md). Includes the
  WhatsApp Business API (step 6.4) once there are customers and orders.
