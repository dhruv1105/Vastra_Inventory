---
name: vastra-domain
description: >
  Load for anything touching items, variants, lookups (types, colours, occasions, tags), stock,
  prices, images or users in Madhurya Vastra. Describes the data model AS IT IS in the code today,
  marks the planned target (stock ledger, money, migrations) separately, and lists the rules
  that keep stock and prices correct.
---

# Domain model — Madhurya Vastra

Source of truth today: the SQL in `app/api/**/route.ts` and `app/api/seed`, `app/api/migrate`.
**There is no schema file in the repo** — columns below are read from that SQL. Do not invent
columns; grep the routes.

## 1. Tables (as used by the code)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id` uuid, `cognito_sub`, `name`, `email`, `phone`, `avatar_url`, `role` | role `owner` \| `seller` |
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
| Schema | Outside the repo; ad-hoc `/api/migrate` | `pg_dump --schema-only` baseline → Drizzle migrations; `/api/migrate` retired |
| Stock | `variants.quantity` overwritten | `stock_movements` ledger (purchase, sale, return, adjustment, reservation); quantity derived |
| Money | Column type unknown, JS numbers | Integer paise or `NUMERIC(12,2)`; formatting via one helper |
| Images | Local `public/uploads`, base64 in JSON | Object storage behind one storage helper; multipart upload |
| Users | Every new user `owner` | New users get no access until the owner assigns a role; customers a separate role |
| SKU / barcode | none | Per-variant SKU + barcode for billing |

## 4. Seed lists (from `app/api/seed`)

Types: Saree, Kurti, Lehenga, Dupatta, Suit Set, Dress, Top, Skirt, Palazzo Set, Sharara Set.
Occasions: Casual, Festive, Wedding, Party, Office Wear, Formal, Daily Wear, Traditional,
Sangeet, Mehendi. Tags include fabrics (Silk, Georgette, Chanderi, Banarasi…) and merch tags
(New Arrival, Trending, Discounted). These are data, not code — never hard-code them in screens.
