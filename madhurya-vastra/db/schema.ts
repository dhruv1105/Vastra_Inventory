// Database schema — the single source of truth. Rebuilt on 2026-10-18 from the SQL the app ran
// (there was no schema in the repo before).
//
// Change a table: edit it here → `npm run db:generate -- --name <what_changed>` → review the SQL
// in db/migrations → `npm run db:migrate`. Never edit an applied migration.
//
// Conventions: uuid ids, audit columns (createdBy/At, updatedBy/At), soft delete via deletedAt,
// money as numeric(12,2) rupees (exact).

import { sql } from "drizzle-orm";
import { check, char, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
const liveOnly = sql`deleted_at IS NULL`;

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cognitoSub: text("cognito_sub").notNull().unique(),
    name: text("name").notNull().default(""),
    email: text("email"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: ["owner", "seller"] }).notNull().default("seller"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [check("users_role_check", sql`${t.role} IN ('owner', 'seller')`)],
);

const audit = () => ({
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// Lookup lists edited on Manage Lists. Names are unique even among soft-deleted rows
// (the routes use ON CONFLICT (name)); re-adding a deleted name returns 409 today.
const lookup = (name: string) =>
  pgTable(name, {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    ...audit(),
    deletedAt: ts("deleted_at"),
  });

export const itemTypes = lookup("item_types");
export const occasions = lookup("occasions");
export const tags = lookup("tags");

export const colors = pgTable(
  "colors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    hexCode: char("hex_code", { length: 7 }),
    ...audit(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [check("colors_hex_check", sql`${t.hexCode} ~ '^#[0-9A-Fa-f]{6}$'`)],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }),
    itemTypeId: uuid("item_type_id").references(() => itemTypes.id),
    wearType: text("wear_type", { enum: ["top", "bottom", "both"] }),
    costPrice: money("cost_price"),
    sellingPrice: money("selling_price").notNull(),
    status: text("status", { enum: ["active", "sold_out", "archived", "draft"] }).notNull().default("active"),
    captionText: text("caption_text"),
    ...audit(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    check("items_wear_type_check", sql`${t.wearType} IN ('top', 'bottom', 'both')`),
    check("items_status_check", sql`${t.status} IN ('active', 'sold_out', 'archived', 'draft')`),
    check("items_cost_price_check", sql`${t.costPrice} >= 0`),
    check("items_selling_price_check", sql`${t.sellingPrice} > 0`),
    index("items_live_created_idx").on(t.createdAt.desc()).where(liveOnly),
    index("items_live_status_idx").on(t.status).where(liveOnly),
    index("items_item_type_idx").on(t.itemTypeId),
  ],
);

/** One row per size × colour of an item. */
export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    size: varchar("size", { length: 20 }).notNull(),
    colorId: uuid("color_id").references(() => colors.id),
    quantity: integer("quantity").notNull().default(0),
    sellingPriceOverride: money("selling_price_override"),
    costPriceOverride: money("cost_price_override"),
    displayOrder: integer("display_order").notNull().default(0),
    ...audit(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    check("variants_quantity_check", sql`${t.quantity} >= 0`),
    check("variants_selling_override_check", sql`${t.sellingPriceOverride} >= 0`),
    check("variants_cost_override_check", sql`${t.costPriceOverride} >= 0`),
    index("variants_item_idx").on(t.itemId, t.displayOrder).where(liveOnly),
    index("variants_color_idx").on(t.colorId),
  ],
);

/** Item photos. s3Key / cdnUrl hold the storage path; today a local /uploads/... path. */
export const images = pgTable(
  "images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    s3Key: text("s3_key").notNull(),
    cdnUrl: text("cdn_url").notNull(),
    mimeType: text("mime_type", { enum: ["image/jpeg", "image/png", "image/webp"] }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    altText: text("alt_text"),
    ...audit(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    check("images_mime_check", sql`${t.mimeType} IN ('image/jpeg', 'image/png', 'image/webp')`),
    check("images_size_check", sql`${t.sizeBytes} > 0`),
    index("images_item_idx").on(t.itemId, t.displayOrder).where(liveOnly),
  ],
);

export const itemOccasions = pgTable(
  "item_occasions",
  {
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    occasionId: uuid("occasion_id").notNull().references(() => occasions.id),
    ...audit(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.occasionId] }), index("item_occasions_occasion_idx").on(t.occasionId)],
);

export const itemTags = pgTable(
  "item_tags",
  {
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id),
    ...audit(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] }), index("item_tags_tag_idx").on(t.tagId)],
);

/** Append-only record of who changed what. Metadata only, no personal data. */
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    payload: jsonb("payload"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_log_entity_idx").on(t.entityType, t.entityId, t.createdAt.desc())],
);
