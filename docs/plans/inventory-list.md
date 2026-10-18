# Inventory list: brief and plan

Status: **Awaiting approval** · 2026-10-18 · Branch: `feat/inventory-list` (from `main`)

## Brief

- **Who:**
  - **Sellers** use it many times a day, on a phone in the shop. A customer asks "do you have the
    maroon Banarasi?" and the seller needs to find it fast.
  - **The owner** uses it daily, on a phone or laptop, to see what is in stock and what is still
    a draft.
- **Problem:** items can be added, but there is nowhere to see them. `/inventory` is a placeholder,
  so finding an item means asking someone or opening the database.
- **How we know it worked:**
  - A seller types three letters of a title and sees the item on screen within about a second.
  - "Do we have this?" (brief: under 10 seconds) is answerable from this screen plus the item page.
  - Low-stock items are visible without opening each one.

## Scope

- **In scope:**
  - `/inventory` shows active and draft items, newest first. Archived items are hidden.
  - Title search runs on the server as you type, debounced and backed by the GIN index.
  - Each card shows the cover photo, title, item type, selling price, total stock and a status
    badge.
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
| 3 | Shows `active` and `draft` items (plus `sold_out` — see question 1), never `archived` or deleted. Newest first, with ties broken by id |
| 4 | Card: cover is the lowest `display_order` live image, with the mark as a fallback when there is no photo. Shows title, type name (or "No type"), price as `₹1,999`, "N in stock", and a badge labelled Active / Draft (never `draft`) |
| 5 | "Low stock" (zari/gold, meaning needs attention) appears when total stock ≤ `LOW_STOCK_AT` (2), for live items only (see question 2) |
| 6 | Search: 300 ms after typing stops, the title is searched by word prefix. "lav geo" matches "Lavender Georgette Saree". The query uses the index expression exactly. Symbols such as `( ) & ! : *` cannot cause an error |
| 7 | An older search response never overwrites a newer one (stale requests are aborted). Clearing the box shows the full list again |
| 8 | "Show more" appends the next 20 with no duplicates or gaps, even if someone adds an item while you scroll (keyset cursor on `created_at, id`). The button disappears on the last page |
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
  - `InventoryItem`: `id`, `title`, `status`, `itemTypeName`, `sellingPrice`, `coverUrl`,
    `coverAlt`, `totalStock`, `variantCount`. There is no cost field.
- **One query per page:**
  - `items` LEFT JOIN `item_types`.
  - A LATERAL join for the cover image: live rows, `ORDER BY display_order LIMIT 1`.
  - A LATERAL join for `SUM(quantity)` and `COUNT(*)` over live variants.
  - `WHERE i.deleted_at IS NULL AND i.status IN (…)`, the optional search clause and the
    optional cursor clause. `ORDER BY i.created_at DESC, i.id DESC LIMIT 21`. The 21st row only
    signals that there is a next page.
- **Search:**
  - The text is split into words and each word is kept as letters and digits only (Unicode).
  - Each word becomes `word:*`, joined with `&`, and is passed as a parameter to
    `to_tsquery('simple', $n)` against `to_tsvector('simple', i.title)`.
  - If nothing is left after cleaning, the request is treated as having no search.
- **Cursor:**
  - The cursor is base64url of `created_at` read as text in SQL (keeping microseconds — a JS
    `Date` would lose them and skip rows) plus the id.
  - It is decoded and validated (timestamp format and UUID) before any SQL runs.
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
       params.
   - Unit tests for `isLowStock()` and the cursor functions.
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

## Questions for approval

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
