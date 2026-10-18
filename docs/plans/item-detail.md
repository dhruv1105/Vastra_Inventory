# Item detail + edit: brief and plan

Status: **Approved 2026-10-18 with answers** (below) · building · Branch: `feat/item-detail` (from `main`)

## Brief

- **Who:**
  - **Sellers**, many times a day on a phone, open an item from the inventory to answer "do we
    have it in M, maroon?" and to fix a typo or a price.
  - **The owner**, daily on phone or laptop, also checks cost and margin, publishes drafts and
    archives items that are gone for good.
- **Problem:** tapping an item shows a placeholder. Nothing can be changed after Add Item: a wrong
  price, a missing photo or a forgotten size means asking a developer.
- **How we know it worked:**
  - "Do we have it in M, maroon?" is answered on one screen, in under 10 seconds (brief).
  - A typo or price fix takes under 30 seconds on a phone.
  - Two people editing the same item never silently overwrite each other.
- **Not in this feature:** changing quantities (comes with the stock ledger), sharing, mark as sold,
  an activity-log screen, and a filter for archived items.

## Acceptance criteria

| # | Criterion |
|---|---|
| **Detail** | |
| D1 | `/items/[id]` shows a photo gallery (cover first, tap a thumbnail to switch), title, type, wear type ("Top + Bottom", never `both`), description, occasions and tags |
| D2 | Selling price, and "from ₹X" when a variant is cheaper. Cost price and margin appear **only for the owner**. The API never sends cost fields (item `cost_price` or variant `cost_price_override`) to a seller — enforced on the server and covered by route tests |
| D3 | Stock: a read-only size × colour grid of quantities, the total, and "Low stock" from `isLowStock()` (`LOW_STOCK_AT`). One-of-a-kind items show "One of a kind" instead of a grid; items with no variants show "No stock added" |
| D4 | "Added by Krishna · 3 days ago" and "Last changed by … · 2 hours ago", in IST and human words |
| D5 | Actions: **Edit** (primary, owner and seller); in the ⋯ menu, **Publish** (drafts only, draft → active; owner and seller), **Archive** (owner only), **Delete** (drafts only, soft delete, ConfirmDialog; owner only), **Restore to inventory** (archived only; owner only). Sellers don't see owner-only actions, and the server answers 403. **Share** and **Mark sold** show as disabled buttons, each with a one-line reason |
| D6 | States: loading skeleton; "This item isn't here" (deleted, unknown or malformed id); load error with Try again; archived items open by direct link with an "Archived" badge |
| D7 | **Restore** (owner): archived → `sold_out` when total live stock is 0, otherwise `active`. Same 409 check; logs `item.restored` |
| **Edit** | |
| E1 | `/items/[id]/edit` reuses the Add Item form, prefilled. Editable by owner and seller: details, selling price and per-variant selling-price overrides, occasions, tags, photos (add, remove, reorder, alt text), new sizes and colours. Cost price and cost overrides: owner only |
| E2 | Quantities are read-only. New variants are created with quantity 0, with the note "Stock changes come with the stock ledger." The server ignores any quantity sent |
| E3 | Removing a size or colour soft-deletes its variants. It is blocked (in the UI and with a server 400) if any of those variants has quantity > 0, saying which ones and why |
| E4 | One-of-a-kind: such an item can't gain sizes or colours until "Turn off one of a kind" is chosen explicitly (with a confirm). Turning it off asks for the piece's **colour** and converts it to a normal variant ("One Size" × that colour, quantity unchanged). The server rejects additions while the flag is on, and refuses to turn the flag on in edit |
| E8 | Sizes are normalised on save (Add Item and edit): trimmed, inner spaces collapsed, known sizes in their usual case (`xl` → `XL`, `free size` → `Free Size`), custom sizes kept as typed. A live duplicate (same size, ignoring case, and colour) returns 400 with a clear message; re-adding a previously removed size or colour works |
| E5 | Concurrency: the form sends the `updatedAt` it loaded (exact, microseconds). If the item changed since then, the save returns **409** and the form shows "Someone else changed this item — reload to see their changes". Everything typed stays; reloading asks first. Publish, archive and delete use the same check |
| E6 | A seller's save never changes cost prices (cost fields in the request are ignored for sellers; stored values are kept) |
| E7 | Validation is the same as Add Item, re-checked on the server (title, wear type, price > 0, photo type/size/count, alt text) |
| **Both** | |
| B1 | Every change writes `activity_log` in the same transaction: `item.updated`, `item.published`, `item.archived`, `item.restored`, `item.deleted`, with `{ before, after }` holding only the fields that changed (cost changes included; selling price changes by sellers always appear), plus variant/photo summaries (added, removed, override changed) |
| B6 | Every read of `activity_log` goes through one central filter (`lib/activity.ts`) that removes cost fields for sellers. A test fails if any code outside it queries `activity_log` for reading, and a test proves sellers never see cost |
| B2 | Each write bumps `items.updated_at` / `updated_by`, including variant and photo changes, so the concurrency check sees them |
| B3 | Signed out → 401 (API) and /login (pages). A wrong role → 403 (see question 1). Nothing writes `variants.quantity` |
| B4 | Works at 390×844, 844×390, 768×1024 and 1366×768, light and dark; tap targets ≥ 44 px; every screen calls the API through `apiFetch` |
| B5 | The dev sample items show every detail state: draft, sold out, one-of-a-kind (in stock and sold), no stock, price overrides, no photo, no type, a long title |

## Plan

### API
- **`GET /api/items/[id]`** (extended):
  - Adds `wearType`, `isOneOfAKind`, `createdBy`/`updatedBy` names, `createdAt`, `updatedAt`, and a
    concurrency token (`version`: `updated_at::text`, microseconds kept).
  - Variants carry `costPriceOverride` for the owner only.
  - Cost fields are built per role in one place (`lib/items.ts`), so a new field can't leak.
- **`PATCH /api/items/[id]`** (edit): one transaction:
  - `SELECT … FOR UPDATE`, compare `version` (409 if changed), then update the fields, replace
    occasions and tags (diffed), and apply photos.
  - Photos: `keep` (id, order, alt text) plus `add` (base64, the same checks as POST). Photos not
    kept are soft-deleted; their files stay on disk until the S3 step.
  - Variants: the desired list. Insert new combinations with quantity 0, soft-delete removed ones
    (400 if quantity > 0), and update overrides.
  - Apply the one-of-a-kind rules, bump `updated_at`, and write the `activity_log` before/after.
  - On a failure, roll back and delete any newly written files.
- **`POST /api/items/[id]/publish`** (draft → active), **`POST /api/items/[id]/archive`**, and
  **`DELETE /api/items/[id]`** (drafts only → `deleted_at`). Each takes `version` (409 if stale) and
  logs to `activity_log`.
- Built to the `api-route` skill: `requireUser` first, plain-sentence errors, parameterised SQL.
  Shared code goes in `lib/items.ts`: loading an item, the cost filter, the diff for `before`/`after`,
  and the variant plan.

### Screens
- **`/items/[id]`** (replaces the placeholder):
  - `components/items/detail/` — `ItemGallery`, `StockGrid` (read-only), `ItemFacts`, `ItemActions`.
  - Reuses `PageHeader`, `Badge`, `Chip` (static), `Menu`, `ConfirmDialog`, `Section`, `Skeleton`,
    `EmptyState` and `formatINR`.
- **`/items/[id]/edit`**:
  - Add Item's page becomes a shared `components/items/ItemForm.tsx` with `mode: "create" | "edit"`.
    `/items/new` and `/items/[id]/edit` both render it.
  - `PhotosSection` learns existing photos (URL, no file). `VariantsSection` gets `lockedQuantities`
    (read-only cells, remove blocked with a reason) and the "Turn off one of a kind" action.
  - A conflict banner appears on 409.
- **Add Item moves to `apiFetch`.** Its behaviour stays the same, checked with before/after
  screenshots.
- **Nav:** `/items/<id>/edit` already counts as Inventory (`ITEM_PAGE`).

### DB changes
- **Migration 0005** (approved), custom SQL because Drizzle can't express it:
  1. Abort with a clear message listing them if live duplicates exist (same item, `lower(btrim(size))`, colour).
  2. Drop any old full `UNIQUE (item_id, size, color_id)` on variants, found by its columns, not by
     name. It would block re-adding a soft-deleted size.
  3. `CREATE UNIQUE INDEX variants_live_unique ON variants (item_id, lower(btrim(size)), color_id)
     NULLS NOT DISTINCT WHERE deleted_at IS NULL`.
  `db/schema.ts` notes the index is managed by the migration.
- `items.updated_at` is the concurrency token; `deleted_at` already exists on items, variants and
  images.

### Steps (one commit each)
1. **API read:** extend `GET /api/items/[id]` and add `lib/items.ts`. Route tests: role-filtered
   cost fields (item and variants), version, names, 404/400.
2. **Migration 0005 + size normalising:** the custom migration, a shared `normalizeSize()` used by Add Item's
   POST. Postgres test: duplicate check aborts, index blocks a live duplicate, re-adding a removed
   size works.
3. **Activity filter:** `lib/activity.ts` (central read + cost filter) and the guard test.
4. **API status actions:** publish, archive, restore, delete. Route tests: role (archive/restore/delete
   owner-only), status rules, restore → sold_out/active, 409, `activity_log`.
5. **API edit:** `PATCH /api/items/[id]`.
   - Route tests:
     - 409 on a stale version.
     - The one-of-a-kind block, and turning it off.
     - Removal blocked when quantity > 0.
     - Quantity ignored.
     - A seller's save keeps the cost prices.
     - Photo keep/add/remove.
     - `activity_log` before/after.
     - Validation 400s.
     - A live duplicate returns 400; re-adding a removed size/colour works.
     - One-of-a-kind turn-off converts the piece to "One Size × colour".
   - Postgres test: two saves from the same version, so the second gets 409.
6. **Form refactor:** `ItemForm` shared component, Add Item on `apiFetch`. No visible change (before/after screenshots).
7. **Detail page:** gallery, facts, stock grid, actions, disabled Share and Mark sold, all states.
8. **Edit page:** edit mode, existing photos, read-only quantities, removal blocks, one-of-a-kind switch, 409 banner keeping input.
9. **Verify and docs:** dev samples at 4 sizes, light and dark, owner and seller; CLAUDE.md/brief/roadmap; acceptance table.

### What users will notice
- Tapping an item opens a real detail page with Edit.
- Drafts can be published from their page, and anything can be archived. Drafts can be deleted.
- Add Item looks and behaves the same.

## Answers (owner, 2026-10-18)

1. **Roles:** sellers edit details and selling price (including variant selling-price overrides) and
   publish. Archive, restore and delete are owner-only. Selling price changes by sellers appear in the
   activity log.
2. **Archived items:** direct links work, with an "Archived" badge and an owner-only **Restore to
   inventory**. Restore sets `sold_out` if total live stock is 0, otherwise `active`. Same 409 check;
   logs `item.restored`.
3. **One of a kind off:** asks for the colour and converts the piece to "One Size × colour", quantity
   unchanged. No "turn on" in edit.
4. **Migration 0005:** yes. A partial unique index with `NULLS NOT DISTINCT` on the normalised size;
   abort clearly if duplicates exist; drop an old full UNIQUE if present. Tests: re-adding a removed
   size/colour works; a live duplicate returns 400 with a clear message.
5. **Cost in the activity log:** store it. Every read of `activity_log` goes through one central cost
   filter, with a test.
6. **Removed photos:** soft-delete, keep the files. "Clean up orphaned photo files" is added to the
   S3 step in the roadmap.

## Original questions

1. **Roles.** Sellers exist today (the owner adds them on /staff), so "everyone is owner" isn't
   true. Proposal:
   - Sellers may **edit** (not cost) and **publish**.
   - **Archive** and **delete** are owner-only (403 for sellers; the menu items are hidden).
   - Agree, or should sellers be allowed more or less?
2. **Archived items** disappear from the list. Proposal: keep a direct link working with an
   "Archived" badge and a **Restore to inventory** action (owner), so an archive is never a dead
   end. A list filter for archived items comes later. Include Restore now?
3. **Turning off one of a kind.** The piece is stored as size "One Size" with no colour, which
   doesn't fit the size × colour grid. Proposal:
   - Turning the flag off asks for the piece's **colour**.
   - The piece becomes a normal variant ("One Size" × that colour, quantity unchanged).
   - Then sizes and colours can be added.
   - Turning the flag **on** in edit isn't offered.
4. **Duplicate variants.** Add the partial unique index above as migration 0005 (protects against a
   double-tapped save)? It's a DB change, so I'm asking first.
5. **Activity payload and cost.** `before`/`after` will include cost price changes. A future
   activity-log screen must hide those from sellers. Store them, or leave cost out of the log?
6. **Removed photos** are soft-deleted (row kept, file kept on disk) until the S3 step, which can
   clean up. OK?

## Progress

- **Step 1 done (2026-10-18).** `GET /api/items/[id]` now returns wear type, one-of-a-kind,
  created/updated by (id + name) and at, and `version` (`updated_at::text`, microseconds kept), via
  `lib/items.ts` (`loadItemFull` / `loadItem`, shareable with transactions). Cost is filtered in one
  place, `lib/cost.ts` (`forRole` / `stripCost`, whole-word "cost"/"margin" keys at any depth): sellers
  now also lose variant `costPriceOverride`, which the old route didn't return to anyone. `types/index.ts`
  `Item` matches the response. Tests: 3 cost-filter unit tests, 6 route tests (401 without SQL, 400/404,
  seller has no cost anywhere, owner has item and variant cost, version and names, live rows only).
  Live check on Postgres: owner sees cost 3000 and override 2800; the seller response contains no "cost".
- **Step 1 follow-up (2026-10-18).** Two layers of cost protection: sellers get `toSellerItem()`
  (built field by field; a new query column stays hidden until listed), and `forRole()` from
  `lib/cost.ts` still runs on top (words now cost, margin, profit, purchase). Value-based Postgres test
  (`tests/db/cost-leak.db.test.ts`): cost 3777.77 on an item and a variant override never appears in
  a seller's detail or inventory-list response (the owner's detail has it); it fails when sellers get
  the owner view. Version token: an opaque string everywhere (documented on `Item.version`); a guard
  test fails on `new Date(…version…)` / `Date.parse(…version…)`; a Postgres test shows two updates
  0.5 ms apart get different versions and the old one no longer matches `updated_at = $1::timestamptz`.
- **Step 2 done (2026-10-18).** Migration `0005_variants_live_unique` (hand-written; `db/schema.ts`
  points to it): aborts listing live duplicates; drops an old full UNIQUE (item_id, size, color_id)
  as a constraint or plain index, found by columns; creates `variants_live_unique` on (item_id,
  lower(trimmed, collapsed size), color_id) NULLS NOT DISTINCT WHERE deleted_at IS NULL.
  `lib/sizes.ts` (normalizeSize / sizeKey) and `lib/variants.ts` (normalizeVariantSizes, duplicate
  message, 23505 mapping) used by POST /api/items and the size picker. `scripts/db.mjs` now prints
  the database's own message first when a migration fails. Postgres migration test (scratch
  databases): duplicate abort + message, old constraint/index dropped, live duplicate refused
  (case/spacing, no-colour = no-colour), removed size re-added. Applied to the dev seed with no
  duplicates. 155 tests + 14 Postgres tests pass.
- **Step 3 done (2026-10-18).** `lib/activity.ts`: `logActivity()` (write, inside the change's
  transaction) and `readActivity()` (the only reader: entries built field by field, payload through
  `forRole()`). New `GET /api/items/[id]/activity` (newest 20, owner and seller) for the item's
  history. Guard test: any `FROM/JOIN activity_log` or Drizzle `from(activityLog)` outside
  `lib/activity.ts` fails. Route tests: 401 without SQL, 400, seller keeps selling-price changes but
  loses every cost change, owner sees all, scoped + bounded query. The 3777.77 leak test now covers
  the history too (and a seller still sees the selling price change); it fails without the filter.
- **Step 4 done (2026-10-18).** `lib/item-status.ts` (`changeItemStatus`): one transaction — row
  locked (`FOR UPDATE OF i`), version compared in SQL, rule applied, `updated_at`/`updated_by` bumped,
  `item.published|archived|restored|deleted` logged with before/after. Routes: `POST
  /api/items/[id]/publish` (owner + seller), `/archive` and `/restore` and `DELETE /api/items/[id]`
  (owner only; sellers get 403 before any SQL). Rules: publish draft → active; archive anything not
  archived; restore archived → sold_out when live stock is 0, else active; delete drafts only
  (soft), "Archive this item instead" otherwise. Body `{ version }`; missing/malformed → 400
  "This page is out of date". 25 route tests + a Postgres flow test (stale token 409, restore by
  stock, delete drafts only, actions logged; a token 0.5 ms older is refused).
  **Open:** an item saved with no variants has stock 0, so restore makes it Sold out (rule as given).
