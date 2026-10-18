# Inventory list: brief and plan

Status: **Approved 2026-10-18 with changes** (below) · building step 1 · · Branch: `feat/inventory-list` (from `main`)

## Brief

- **Who:**
  - **Sellers** use it many times a day, on a phone in the shop. A customer points at a photo of
    the "Lavender Georgette Saree" and the seller types "lav geo" to find it fast.
  - **The owner** uses it daily, on a phone or laptop, to see what is in stock and what is still
    a draft.
- **Problem:** items can be added, but there is nowhere to see them. `/inventory` is a placeholder,
  so finding an item means asking someone or opening the database.
- **How we know it worked:**
  - A seller types three letters of a title and sees the item on screen within about a second.
  - "Do we have this?" (brief: under 10 seconds) is answerable from this screen plus the item page.
  - Low-stock items are visible without opening each one.
- **Search is title-only in this feature.** Search by colour and type is a follow-up (roadmap).

## Scope

- **In scope:**
  - `/inventory` shows active, draft and sold-out items, newest first. Archived items are hidden.
  - Title search runs on the server as you type, debounced and backed by the GIN index.
  - Each card shows the cover photo, title, item type, price ("from ₹X" when a variant is
    cheaper), total stock, and a badge for Draft or Sold out only.
  - A "Low stock" marker appears when total stock is 2 or less. The threshold is one constant.
  - Tapping a card opens `/items/[id]`, which is a placeholder for now.
  - "Show more" loads the next 20 items, using a cursor.
  - The screen has an empty state, a loading skeleton, a no-results state and an error state.
  - Layout is a list on phones and a grid from tablet width up.
- **Out of scope:** filters, editing, stock changes and sales.
- **Rules:**
  - Read-only: nothing writes to `variants.quantity` or anything else.
  - Cost price never appears in the list response, for either role.

## Acceptance criteria

| # | Criterion |
|---|---|
| 1 | Signed out: `/inventory` redirects to /login, and `GET /api/items` returns 401 without running any SQL |
| 2 | Owner and seller both see the same list. The list API never selects or returns `cost_price` |
| 3 | Shows `active`, `draft` and `sold_out` items, never `archived` or deleted. `ORDER BY created_at DESC, id DESC` |
| 4 | Card: cover is the lowest `display_order` live image, with the mark as a fallback when there is no photo. Shows title, type name (or "No type"), price as `₹1,999`, and stock as "N in stock" (or "No stock added" when the item has no variants) |
| 4a | Price: "from ₹X" when any live variant has a selling-price override lower than the item's price; otherwise the item's selling price. Computed in the same query (`MIN(selling_price_override)` over live variants, compared in SQL as `numeric`) |
| 4b | Badges: "Draft" and "Sold out" only, with no badge for active items. Sold-out cards are slightly dimmed |
| 5 | "Low stock" (zari/gold, meaning needs attention) appears when total stock ≤ `LOW_STOCK_AT` (2). It is never shown for drafts, sold-out items, one-of-a-kind items, or items with no variants |
| 6 | Search: 300 ms after typing stops, the title is searched by word prefix. "lav geo" matches "Lavender Georgette Saree". The query uses the index expression exactly. Symbols such as `( ) & ! : *` cannot cause an error |
| 7 | An older search response never overwrites a newer one (stale requests are aborted). Clearing the box shows the full list again |
| 8 | "Show more" appends the next 20 with no duplicates or gaps, even if someone adds an item while you scroll, and even when many items share one `created_at` (`NOW()` is the transaction start time, so items saved in one transaction share it). Composite cursor `(created_at, id)` with a row comparison `(i.created_at, i.id) < ($c, $id)`. Proven by a database test that inserts 25 items in one transaction and pages through all 25. The button disappears on the last page |
| 9 | Invalid input: a bad cursor or a query over 100 characters returns 400 with a plain sentence, and no SQL runs |
| 10 | States: a skeleton on first load and on a new search; "Your shelves are empty" with Add Item when nothing exists; "No items match …" with Clear search; a network or server error shows a plain sentence with Try again; a failed "Show more" keeps the items already shown |
| 11 | Tapping a card opens `/items/[id]`, a placeholder with a way back. Inventory stays highlighted in the nav. The search survives Back (kept in `?q=`) |
| 12 | Works at 390×844, 844×390, 768×1024 and 1366×768, in light and dark, with no horizontal scroll and tap targets ≥ 44px |
| 13 | Large list: every request is bounded to 21 rows, one query per page with no N+1. It uses the existing `items_live_created_idx`, `images_item_idx`, `variants_item_idx` and the new title search index |

## Plan

### API: `GET /api/items` (added beside the existing POST in `app/api/items/route.ts`)

- **Request:**
  - Guarded with `requireUser(request)`; both roles are allowed.
  - Query params: `q` (optional, trimmed, ≤ 100 characters) and `cursor` (optional, opaque).
- **Response:**
  - `{ data: { items: InventoryItem[], nextCursor: string | null } }`.
  - `InventoryItem`: `id`, `title`, `status`, `itemTypeName`, `sellingPrice`, `fromPrice`
    (lower variant price or null), `coverUrl`, `coverAlt`, `totalStock`, `variantCount`,
    `isOneOfAKind`. There is no cost field.
- **One query per page:**
  - `items` LEFT JOIN `item_types`.
  - A LATERAL join for the cover image: live rows, `ORDER BY display_order LIMIT 1`.
  - A LATERAL join over live variants: `SUM(quantity)`, `COUNT(*)` and
    `MIN(selling_price_override)`. `fromPrice` is that minimum only when it is below
    `selling_price`.
  - `WHERE i.deleted_at IS NULL AND i.status IN (…)`, the optional search clause and the
    optional cursor clause. `ORDER BY i.created_at DESC, i.id DESC LIMIT 21`. The 21st row only
    signals that there is a next page.
- **Search:**
  - The text is split into words and each word is kept as letters and digits only (Unicode).
  - Each word becomes `word:*`, joined with `&`, and is passed as a parameter to
    `to_tsquery('simple', $n)` against `to_tsvector('simple', i.title)`.
  - If nothing is left after cleaning, the request is treated as having no search.
- **Cursor (composite):**
  - `ORDER BY i.created_at DESC, i.id DESC`, and the next page is
    `(i.created_at, i.id) < ($c::timestamptz, $id::uuid)`, a row comparison. A
    `created_at`-only cursor would skip or repeat items saved in the same transaction, because
    they share `NOW()`.
  - The cursor is base64url of `created_at` read as text in SQL (keeping microseconds — a JS
    `Date` would lose them) plus the id. It is decoded and validated (timestamp format and UUID)
    before any SQL runs.
- **Shared code:** a new `lib/inventory.ts` holds `LOW_STOCK_AT = 2`, `PAGE_SIZE = 20`,
  `isLowStock()`, `toPrefixQuery()`, `encodeCursor()`/`decodeCursor()` and `STATUS_LABEL`.

### Screen: `/inventory`

- **Components:**
  - `components/inventory/InventoryCard.tsx`: one component that is a row on phones and a card
    from `md` up.
  - `InventorySearch` (`Input` with a search icon, a clear button and a 300 ms debounce).
  - `InventorySkeleton`.
- **Kit:** reuses `PageHeader` (with the Add Item action), `EmptyState`, `Skeleton`, `Input`,
  `Button`, `LinkButton`, `BrandMark` and `formatINR`.
- **New kit piece:** `components/ui/Badge.tsx`, with tones neutral, primary, zari, success and
  danger. Status and Low stock use it, and it is added to `/kit`. The kit has no badge today.
- **Photos:** a plain lazy-loaded `<img>`, matching `ImageUploader`. Photos are local uploads,
  not `next/image`. The square crop uses Tailwind's built-in `aspect-square`.

### Item placeholder: `/items/[id]`

- `PageHeader` with a back link to Inventory, plus `EmptyState` saying "Item details come next".
- **Nav change:** `components/layout/nav.ts` keeps Inventory active on `/items/<id>`, but not on
  `/items/new`.

### DB changes

None. The GIN title index was merged in #3. Your dev database needs `./scripts/db.sh migrate`
once if it hasn't run since then.

### Steps (one commit each)

1. **API:**
   - `lib/inventory.ts` and `GET /api/items`.
   - Tests in `tests/api/items.test.ts`:
     - 401 without SQL; seller and owner OK.
     - SQL never contains `cost_price` and the response has no `costPrice`.
     - Statuses filtered, archived excluded.
     - Search uses the index expression and `deleted_at IS NULL`; prefix query built; symbols
       stripped; empty after cleaning means no search.
     - `q` over 100 characters and a bad cursor → 400 with no SQL.
     - 21 rows → 20 rows plus a `nextCursor`; 20 rows → `null`; a cursor round trip sends both
       params; the SQL uses the row comparison and the `created_at DESC, id DESC` order.
   - Unit tests for `isLowStock()`, `toPrefixQuery()` and the cursor functions.
   - **Database test** `tests/db/items-list.db.test.ts` against real Postgres: it inserts 25
     items in one transaction (one shared `created_at`) and pages 20 + 5 through `GET /api/items`,
     expecting all 25 with no repeats. It runs when `TEST_DATABASE_URL` is set
     (`npm run test:db`), applies the migrations itself and deletes its own rows; plain `npm test`
     skips it.
2. **Kit:** `Badge`, plus its `/kit` preview.
3. **Inventory screen:** search, list/grid, Show more, and all the states. Replaces the placeholder.
4. **`/items/[id]`:** the placeholder page and the nav highlight.
5. **Verify and docs:**
   - Both roles at the 4 sizes, light and dark, with before/after screenshots.
   - The `CLAUDE.md` layout lists `components/inventory/` and `/items/[id]`.
   - The roadmap's "current step" moves to item detail/edit.

### What users will notice

- `/inventory` shows real items instead of the placeholder.
- Cards open a new item page, for now a placeholder.
- Inventory stays highlighted while viewing an item.

### Verification environment

Docker isn't available in the cloud session. I'll verify on a throwaway Postgres 16 with this
repo's migrations and seeds, plus `next dev` with the dev owner and a seller created through
`/staff`.

## Answers (owner, 2026-10-18)

1. Sold-out items show, with a "Sold out" badge and a slightly dimmed card.
2. No low-stock marker on one-of-a-kind items or drafts. Detection: see "One-of-a-kind" below.
3. Items with no variants show "No stock added" and no low-stock marker.
4. "from ₹X" when any live variant has a lower override; otherwise the item price. Same query.
5. Badges: Draft and Sold out only. No Active badge.

## One-of-a-kind (approved 2026-10-18, done before step 2)

Today Add Item saves a one-of-a-kind piece as exactly one variant with size "One Size", no colour
and quantity 1 (`components/items/form.ts`). Nothing else marks it. So detection relies on those
values (one live variant AND `size = 'One Size'` AND `color_id IS NULL`). It would break if
someone typed "One Size" as a custom size, or once item editing can change the variant.

Migration `0004_items_one_of_a_kind` (approved; backfill ignores quantity, since a sold piece has 0):
- `items.is_one_of_a_kind boolean NOT NULL DEFAULT false` (Drizzle schema + generated migration).
- Backfill: `true` where the item has exactly that one-variant shape.
- Add Item's POST sends `isOneOfAKind`; the route stores it, ignoring the old shape.
- The list reads the column. Route tests cover the POST field.

Edit rule for the item detail/edit feature (roadmap step 2): a one-of-a-kind item can't gain sizes
or colours until the flag is turned off, as an explicit action in the edit UI.

## Original questions

1. **`sold_out` items:** you said "active + draft; hide archived". Nothing sets `sold_out` today,
   but once mark-as-sold exists those items exist too. Should they show (badge "Sold out"), or
   stay hidden like archived? I propose **show**, because "do we have this?" → "sold out" is a
   useful answer.
2. **One-of-a-kind items are stored as one variant, "One Size", with quantity 1.** With the
   threshold at ≤ 2, every one-of-a-kind piece would always say "Low stock". This also differs
   from `vastra-domain`, which says they have no variants; the code wins. I propose: **no Low
   stock marker on one-of-a-kind items** (detected as a single variant with no colour and size
   "One Size"), and **none on drafts**. Or keep the marker on everything?
3. **Items saved with no variants** (allowed when sizes and colours are skipped): total stock
   is 0. I propose showing "Stock not tracked" with no Low stock marker, instead of "0 in stock".
4. **Price:** the card shows the item selling price. If some variants override it, should the
   card say "from ₹1,799"? I propose **item price only** for now; overrides show on the item page.
5. **Status badge on active items:** the rules say "show the normal case quietly". I propose a
   subtle green "Active" badge and a stronger "Draft" badge. Or show only Draft?

## Progress

- **Step 1 done (2026-10-18).** `GET /api/items` (beside POST) with `lib/inventory.ts` (shared:
  `PAGE_SIZE`, `LOW_STOCK_AT`, `SEARCH_MAX`, `LIST_STATUSES`, `STATUS_BADGE`, `isLowStock`,
  `InventoryItem`) and `lib/inventory-query.ts` (server: `toPrefixQuery`, cursor encode/decode).
  The response is built field by field, so a cost column can never leak through. Tests: 13 route
  tests in `tests/api/items.test.ts`, 8 unit tests in `tests/lib/inventory.test.ts` (90 total), and
  `tests/db/items-list.db.test.ts` (`npm run test:db`). It passed on Postgres 16, can be re-run
  and deletes its rows. With the cursor switched to `created_at` alone, it fails — the last 5
  items are never returned. EXPLAIN on 3,000 items: search → Bitmap Index Scan on
  `items_live_title_search_idx`; variants → `variants_item_idx`. Without search, Postgres chose a
  sequential scan + sort at that size.
  **Not verified:** the Docker dev stack (unavailable in the cloud session); the screen (step 3).
- **One-of-a-kind flag done (2026-10-18).** `items.is_one_of_a_kind boolean NOT NULL DEFAULT false`
  (migration 0004, with a backfill: exactly one live variant, size 'One Size', no colour, any
  quantity). Checked on Postgres 16 by migrating to 0003, inserting six shapes and applying 0004:
  one piece in stock ✓, sold piece (qty 0) ✓, one live + one deleted variant ✓; with a colour ✗, two
  variants ✗, no variants ✗. Re-running is a no-op. Add Item sends `isOneOfAKind`. POST stores it
  and rejects the flag unless the item is exactly one "One Size" variant with no colour. GET reads
  the column. `ONE_SIZE` lives in `lib/inventory.ts` (shared with Add Item). 8 more tests (98 total)
  and the database test checks the flag. Production build passes.
- **Step 2 done (2026-10-18).** `components/ui/Badge.tsx`: non-interactive status label with
  tones neutral / primary / zari (needs attention) / success / danger and an optional icon. Text
  is always present, so state never depends on colour alone. Added to `/kit` ("Badges"). Checked at
  390 px in light and dark.
- **Dev seed (2026-10-18).** `db/seeds/dev/020_inventory_samples.sql` (run with `./scripts/db.sh seed`):
  30 items, 28 visible. Each state appears at least once (counts on screen: Low stock 4, Draft 3,
  Sold out 2, No stock added 2, One of a kind 4, "from ₹" 4, No type 1); archived and deleted
  items are hidden. Placeholder covers in `public/dev-samples/`.
- **Step 3 done (2026-10-18).** `/inventory`: `components/inventory/InventoryCard.tsx` (row on
  phones, portrait card from `md`), `InventorySkeleton.tsx`, page with a 300 ms debounced search kept
  in `?q=`, stale requests aborted, Show more (a failure keeps the shown items and offers Try again),
  and loading / empty / no-results / error states. Grid 3 → 4 → 5 columns (md / lg / xl). New theme
  token `aspect-portrait` (4:5). Sold-out cards are dimmed and drop the stock text (the badge says
  it). Checked in Chromium on Postgres 16 with the dev seed, at 390×844, 844×390, 768×1024 and
  1366×768 (light; dark at phone and laptop): 20 → 28 after Show more, no duplicates, archived and
  deleted never shown, no horizontal scroll, "lav geo" → Lavender Georgette Saree only, symbols
  harmless, Back restores the search, owner and a new seller see the same list and no cost field.
  Empty, error, loading and failed Show more were produced by stubbing the API in the browser.
  Known until step 4: card links go to `/items/<id>`, which is still a 404.
