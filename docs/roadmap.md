# Roadmap

Each step needs its own brief and plan (`/new-feature`) when its turn comes. Keep this list
short and current.

## Phase 1 order (agreed with the owner, 2026-10-18; reordered 2026-11-17)

Done: UI redesign (R0–R6), real authentication (A1–A6), inventory list (step 1), item detail +
edit (step 2), caption templates + sharing (step 3).

1. ~~**Inventory list**~~ — done 2026-10-18 ([plans/inventory-list.md](plans/inventory-list.md)).
2. ~~**Item detail / edit**~~ — done 2026-11-05 ([plans/item-detail.md](plans/item-detail.md)):
   `/items/[id]` and `/items/[id]/edit`, publish / archive / restore / delete, concurrency check,
   history in `activity_log`, colour combinations and colours in the design.
3. ~~**Caption templates + sharing**~~ — done 2026-11-05 ([plans/sharing.md](plans/sharing.md)):
   captions and shop details on Manage Lists → Captions (owner and sellers), share sheet on the
   item page and inventory cards (photos as JPEG + caption, details opt-in), text-only share of
   generic captions. Uses the phone's share menu only — no Meta API (see phase E).
### A. Close out

4. **Sharing checked on a real phone, then CI** ← *next* — test `feat/sharing` on a phone over
   HTTPS (`phone-test` skill), as owner and as seller, fix what turns up, merge. Then GitHub
   Actions on every pull request and push to `main`: lint, typecheck (`tsc --noEmit`), tests
   (`npm test`, plus the Postgres tests in a `postgres:16` service with `TEST_DATABASE_URL`) and
   `npm run build`. Branch protection: `main` merges only when it is green. (Not built yet.)

### B. Go live

5. **Photo storage** — one storage helper (local disk in development, S3 in production).
   Includes **cleaning up orphaned photo files**: removed photos are soft-deleted rows whose
   files stay on disk (item edit, 2026-10-18).
6. **Hosting with a safety net** — host the app (see "Hosting" below) with: a nightly database
   backup kept off the server, **one restore actually tried**, error alerts, an uptime check, and
   deploys from `main` only after CI is green. Done when the owner signs in on the real address.
   *Owner, in parallel (no code):* confirm the Instagram account is Business/Creator, which
   WhatsApp app the shop uses, and create the Meta app — review can take weeks (needed in E).

### C. True stock

The app cannot stay correct in daily use until this phase is done: today stock is set once when
an item is added and nothing can change it afterwards.

7. **Stock-movement ledger** — opening stock, purchase, sale, return, adjustment recorded as
   rows; current quantity derived (see [decisions](decisions/README.md)). Existing quantities
   become "opening stock" rows.
8. **Adjust and receive stock** — the screens over the ledger: add newly arrived pieces to an
   item, correct a wrong count with a reason (damaged, lost, miscount). This is also how the
   shop's existing stock gets in before go-live.
9. **Mark as sold** — record a sale against a variant through the ledger: price actually charged,
   discount, cash / UPI, who sold it; undo for a mistaken tap. Sales get their own table so later
   steps can point at a sale.
10. **Returns and exchanges** — a customer brings a piece back. Find the sale, pick the piece,
    then either **return** (piece goes back on the shelf or is marked damaged; money handed back
    is recorded) or **exchange** (the return plus a new sale in one action; the difference to pay
    or refund is shown and recorded). Every return keeps its link to the original sale, a reason
    and who handled it, so the day's total and the dashboard stay true. To settle in its brief
    with the owner: the shop's policy (refund, exchange only, or credit for later), how many days
    after the sale, what happens when the sale was never recorded in the app, and whether a
    returned piece can go back on sale at a different price.
11. **Stock count** — month-end count on the phone: walk the shelf, enter what is there, review
    the differences, confirm → adjustment rows. This is the outside check for the whole phase:
    after a week of real sales, the count matches the app.
12. **Inventory search by colour and item type** (step 1 searches titles only).

### D. See the business

13. **Dashboard + activity log** — the dashboard below (sales net of returns), plus a screen
    over `activity_log`.
14. **QR labels per variant** — print a tag; a seller scans it to open the item or sell it.

### E. Reach (Meta integrations: Instagram + WhatsApp)

After hosting, because Instagram's API only takes photos at a public HTTPS address — and after
phase C, so posts and automatic replies never quote sizes that are already sold. Each part gets
its own brief and plan; options, prerequisites and costs researched in
[plans/sharing.md](plans/sharing.md#later-meta-integrations-own-roadmap-step-after-hosting)
(re-check Meta's docs before building).

15. **Instagram post from the app** — item photos (carousel) + caption posted to
    @madhuryavastra in one tap. Needs a Business/Creator account and a Meta app (Instagram
    Login). Free.
16. **Comment → automatic DM** — a customer comments "price" on a post and gets the item's
    details by DM. Needs Meta's messaging permission (app review). Free.
17. **WhatsApp Business catalogue** — items synced to the shop's WhatsApp catalogue. Free.

**WhatsApp Business API** (broadcasts to opted-in customers, order updates) is paid per message
and needs a customer list, so it stays in phase 2 with customers and orders.


## Dashboard (step 13 — after mark as sold holds real data)

The `/dashboard` screen is a placeholder until there is data worth summarising. First version:
- Today's sales (count, ₹ total, returns taken off) and this month vs last month.
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
- Hosting (step 6): AWS (App Runner/ECS + RDS + S3, using the Docker image) or Vercel
  (+ Neon/RDS + S3) — still to decide.
- Customer storefront + payments (phase 2) — see [decisions](decisions/README.md). Includes the
  WhatsApp Business API once there are customers and orders.
