# Roadmap

Each step needs its own brief and plan (`/new-feature`) when its turn comes. Keep this list
short and current.

## Phase 1 order (agreed with the owner, 2026-10-18)

Done: UI redesign (R0–R6), real authentication (A1–A6).

1. **Inventory list** — `/inventory` shows items with cover photo, price, stock and status;
   search and load-more. ← *current step*
2. **Item detail / edit** — `/items/[id]`: view an item and change it.
3. **Caption templates + sharing** — build a caption from the item (`items.caption_text`) and
   share photos + caption to **WhatsApp and Instagram**. **Mandatory in phase 1.**
4. **S3 photo storage + hosting** — one storage helper (local disk in development, S3 in
   production), then host the app (see "Hosting" below).
5. **Stock-movement ledger** — purchase, sale, return, adjustment recorded as rows; current
   quantity derived (see [decisions](decisions/README.md)).
6. **Mark as sold** — record a sale against a variant through the ledger.
7. **Dashboard + activity log** — the dashboard below, plus a screen over `activity_log`.

## Dashboard (step 7 — after mark as sold holds real data)

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
- ~~Real authentication~~ — done 2026-10-18 (better-auth, docs/plans/auth.md).
- SKU / barcode per variant (after the stock ledger).
- Hosting (step 4): AWS (App Runner/ECS + RDS + S3, using the Docker image) or Vercel
  (+ Neon/RDS + S3) — still to decide.
- Customer storefront + payments (phase 2) — see [decisions](decisions/README.md).
