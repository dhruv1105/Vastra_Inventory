---
name: vastra-domain
description: >
  Load for anything touching items, variants, lookups (types, colours, occasions, tags), stock,
  prices, images or users in Madhurya Vastra. Describes the data model AS IT IS in the code today,
  marks the planned target (stock ledger, money, migrations) separately, and lists the rules
  that keep stock and prices correct.
---

# Domain model — Madhurya Vastra

Source of truth: **`madhurya-vastra/db/schema.ts`** (Drizzle), applied by the migrations in
`db/migrations/`. It was rebuilt from the routes' SQL on 2026-10-18. Do not invent columns;
read the schema.

**Changing the database:** edit `db/schema.ts` → `npm run db:generate -- --name <change>` →
read the generated SQL → `./scripts/db.sh migrate`. Never edit an applied migration. Data the
app needs to start (lookup lists) goes in `db/seeds/*.sql`, written to be safe to re-run
(`ON CONFLICT DO NOTHING`); development-only rows go in `db/seeds/dev/`.

## 1. Tables (as used by the code)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id` uuid, `name`, `email` (placeholder on .invalid for phone-only staff), `phone` (E.164), `role`, `disabled`, `must_change_password` | better-auth user table; also `sessions`, `accounts` (password hash), `verifications`, `rate_limits` |
| `items` | `id`, `title` (≤150), `description` (≤500), `item_type_id`, `wear_type`, `cost_price`, `selling_price`, `status` | `wear_type` `top`/`bottom`/`both`; `status` `active`/`draft`/`sold_out`/`archived` |
| `variants` | `id`, `item_id`, `size`, `color_id`, `quantity`, `selling_price_override`, `cost_price_override`, `display_order` | one row per size × colour |
| `images` | `id`, `item_id`, `s3_key`, `cdn_url`, `mime_type`, `size_bytes`, `display_order`, `alt_text` | files under `public/uploads/items/<itemId>/` today; first = cover |
| `item_types`, `colors` (`hex_code`), `occasions`, `tags` | `id`, `name` unique | lookups; soft delete via `deleted_at` |
| `item_occasions`, `item_tags` | `item_id`, `occasion_id`/`tag_id` | many-to-many |
| `activity_log` | `actor_id`, `action` (`item.created`), `entity_type`, `entity_id`, `payload` json | append-only |

Every table carries `created_by`, `created_at`, `updated_by`, `updated_at`; lookups also
`deleted_at`. Ids are `gen_random_uuid()`.

## 2. Rules

- **Item → Variant.** An item with sizes/colours has one variant per size × colour. A
  one-of-a-kind item has no variants.
- **Price resolution:** variant `selling_price_override` if set, else item `selling_price`.
  Same for cost. Margin = selling − cost, shown only to staff.
- **Cost price is private** — never in a customer-facing response (phase 2).
- **Lookups are soft-deleted** (`deleted_at`); filter `WHERE deleted_at IS NULL`. A lookup in use
  by an item stays readable on that item.
- **Status words on screen:** Active, Draft, Sold out, Archived. Draft = saved, not yet in
  inventory.
- **Every write logs `activity_log`** in the same transaction.

## 3. Planned target (do not build without a plan approval)

| Topic | Today | Target |
|---|---|---|
| Queries | Raw SQL via `query()` in routes | New code may use the typed `db` client; migrate routes gradually |
| Stock | `variants.quantity` overwritten | `stock_movements` ledger (purchase, sale, return, adjustment, reservation); quantity derived |
| Money | `numeric(12,2)` rupees (decided); routes read `::float8` | One formatting helper; never float arithmetic for totals |
| Images | Local `public/uploads`, base64 in JSON | Object storage behind one storage helper; multipart upload |
| Users | better-auth user table (`users`), owner adds staff, roles owner / seller (docs/plans/auth.md) | Customers as a separate role in phase 2 |
| SKU / barcode | none | Per-variant SKU + barcode for billing |

## 4. Seed lists (`db/seeds/010_lookups.sql`)

Types: Saree, Kurti, Lehenga, Dupatta, Suit Set, Dress, Top, Skirt, Palazzo Set, Sharara Set.
Occasions: Casual, Festive, Wedding, Party, Office Wear, Formal, Daily Wear, Traditional,
Sangeet, Mehendi. Tags include fabrics (Silk, Georgette, Chanderi, Banarasi…) and merch tags
(New Arrival, Trending, Discounted). These are data, not code — never hard-code them in screens.
