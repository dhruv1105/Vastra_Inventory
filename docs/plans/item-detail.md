# Item detail + edit: brief and plan

Status: **Awaiting approval** · 2026-10-18 · Branch: `feat/item-detail` (from `main`)

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
| D5 | Actions: **Edit** (primary); in the ⋯ menu, **Publish** (drafts only, draft → active), **Archive**, **Delete** (drafts only, soft delete, with a ConfirmDialog). **Share** and **Mark sold** show as disabled buttons, each with a one-line reason |
| D6 | States: loading skeleton; "This item isn't here" (deleted, unknown or malformed id); load error with Try again; archived items open by direct link with an "Archived" badge (see question 2) |
| **Edit** | |
| E1 | `/items/[id]/edit` reuses the Add Item form, prefilled. Editable: details, prices (cost only for the owner), occasions, tags, photos (add, remove, reorder, alt text), new sizes and colours, and per-variant price overrides |
| E2 | Quantities are read-only. New variants are created with quantity 0, with the note "Stock changes come with the stock ledger." The server ignores any quantity sent |
| E3 | Removing a size or colour soft-deletes its variants. It is blocked (in the UI and with a server 400) if any of those variants has quantity > 0, saying which ones and why |
| E4 | One-of-a-kind: such an item can't gain sizes or colours until "Turn off one of a kind" is chosen explicitly (with a confirm). The server rejects additions while the flag is on, and refuses to turn the flag on in edit |
| E5 | Concurrency: the form sends the `updatedAt` it loaded (exact, microseconds). If the item changed since then, the save returns **409** and the form shows "Someone else changed this item — reload to see their changes". Everything typed stays; reloading asks first. Publish, archive and delete use the same check |
| E6 | A seller's save never changes cost prices (cost fields in the request are ignored for sellers; stored values are kept) |
| E7 | Validation is the same as Add Item, re-checked on the server (title, wear type, price > 0, photo type/size/count, alt text) |
| **Both** | |
| B1 | Every change writes `activity_log` in the same transaction: `item.updated`, `item.published`, `item.archived`, `item.deleted`, with `{ before, after }` holding only the fields that changed, plus variant/photo summaries (added, removed, override changed) |
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
- None required. `items.updated_at` is the concurrency token, and `deleted_at` already exists on
  items, variants and images.
- Proposed (question 4): a partial unique index on live variants
  `(item_id, size, COALESCE(color_id, '00000000-…'))`, so edits can never create a duplicate.

### Steps (one commit each)
1. **API read:** extend `GET /api/items/[id]` and add `lib/items.ts`. Route tests: role-filtered
   cost fields (item and variants), version, names, 404/400.
2. **API status actions:** publish, archive, delete. Route tests: role, status rules, 409,
   `activity_log`.
3. **API edit:** `PATCH /api/items/[id]`.
   - Route tests:
     - 409 on a stale version.
     - The one-of-a-kind block, and turning it off.
     - Removal blocked when quantity > 0.
     - Quantity ignored.
     - A seller's save keeps the cost prices.
     - Photo keep/add/remove.
     - `activity_log` before/after.
     - Validation 400s.
   - Postgres test: two saves from the same version, so the second gets 409.
4. **Form refactor:** `ItemForm` shared component, Add Item on `apiFetch`. No visible change (before/after screenshots).
5. **Detail page:** gallery, facts, stock grid, actions, disabled Share and Mark sold, all states.
6. **Edit page:** edit mode, existing photos, read-only quantities, removal blocks, one-of-a-kind switch, 409 banner keeping input.
7. **Verify and docs:** dev samples at 4 sizes, light and dark, owner and seller; CLAUDE.md/brief/roadmap; acceptance table.

### What users will notice
- Tapping an item opens a real detail page with Edit.
- Drafts can be published from their page, and anything can be archived. Drafts can be deleted.
- Add Item looks and behaves the same.

## Questions for approval

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
