# Roadmap — later, once enough of the app exists

Ideas agreed with the owner that are **not** being built now. Each needs its own brief and plan
(`/new-feature`) when its turn comes. Keep this list short and current.

## Dashboard (after Inventory list + Sales hold real data)

The `/dashboard` screen is a placeholder until there is data worth summarising. First version:
- Today's sales (count, ₹ total) and this month vs last month.
- Items running low: variants at or below a reorder level.
- Best sellers this month by item type, occasion and colour.
- Stock value at cost (owner only).

Code marker: `app/(protected)/dashboard/page.tsx` (TODO(roadmap) comment).

## Admin theming (after the redesign and real auth)

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
- Stock-movement ledger before Sales; SKU / barcode per variant.
- Photo storage helper (local disk in development, S3 in production) before hosting.
- Hosting: AWS (App Runner/ECS + RDS + S3, using the Docker image) or Vercel (+ Neon/RDS + S3).
- Customer storefront + payments (phase 2) — see [decisions](decisions/README.md).
