import type { PoolClient } from "pg";
import { query } from "@/lib/db";
import { forRole } from "@/lib/cost";
import type { Role } from "@/lib/auth/roles";
import type { Item, ItemSellerView } from "@/types";

// Server-only: reading one item with everything the detail and edit screens need.
// Cost fields are always loaded, then filtered per role by forRole() — never by hand here.

type Run = (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
const viaPool: Run = (text, params) => query(text, params);
/** Inside a transaction: one query at a time on the client (pg warns about overlapping queries). */
export function viaClient(client: PoolClient): Run {
  let last: Promise<unknown> = Promise.resolve();
  return (text, params) => {
    const next = last.then(() => client.query(text, params));
    last = next.catch(() => {});
    return next;
  };
}

/** The item with all relations (owner view, cost included), or null when missing or deleted. */
export async function loadItemFull(id: string, run: Run = viaPool): Promise<Item | null> {
  const itemRes = await run(
    `SELECT i.id, i.title, i.description, i.item_type_id AS "itemTypeId", t.name AS "itemTypeName",
            i.wear_type AS "wearType", i.status, i.is_one_of_a_kind AS "isOneOfAKind",
            i.selling_price::float8 AS "sellingPrice", i.cost_price::float8 AS "costPrice",
            i.caption_text AS "captionText",
            i.created_at AS "createdAt", i.updated_at AS "updatedAt",
            i.updated_at::text AS "version",
            CASE WHEN cu.id IS NULL THEN NULL ELSE json_build_object('id', cu.id, 'name', cu.name) END AS "createdBy",
            CASE WHEN uu.id IS NULL THEN NULL ELSE json_build_object('id', uu.id, 'name', uu.name) END AS "updatedBy"
     FROM items i
     LEFT JOIN item_types t ON t.id = i.item_type_id
     LEFT JOIN users cu ON cu.id = i.created_by
     LEFT JOIN users uu ON uu.id = i.updated_by
     WHERE i.id = $1 AND i.deleted_at IS NULL`,
    [id]
  );
  if (itemRes.rows.length === 0) return null;

  const [occasions, tags, designColors, variants, images] = await Promise.all([
    run(
      `SELECT o.id, o.name, o.created_at AS "createdAt"
       FROM item_occasions io JOIN occasions o ON o.id = io.occasion_id
       WHERE io.item_id = $1 ORDER BY o.name`,
      [id]
    ),
    run(
      `SELECT t.id, t.name, t.created_at AS "createdAt"
       FROM item_tags it JOIN tags t ON t.id = it.tag_id
       WHERE it.item_id = $1 ORDER BY t.name`,
      [id]
    ),
    run(
      `SELECT c.id, c.name, c.hex_code AS "hexCode", c.hex_code_2 AS "hexCode2", c.created_at AS "createdAt"
       FROM item_colors ic JOIN colors c ON c.id = ic.color_id
       WHERE ic.item_id = $1 ORDER BY c.name`,
      [id]
    ),
    run(
      `SELECT v.id, v.size, v.color_id AS "colorId", c.name AS "colorName", c.hex_code AS "colorHex", c.hex_code_2 AS "colorHex2",
              v.quantity, v.selling_price_override::float8 AS "sellingPriceOverride",
              v.cost_price_override::float8 AS "costPriceOverride", v.display_order AS "displayOrder"
       FROM variants v LEFT JOIN colors c ON c.id = v.color_id
       WHERE v.item_id = $1 AND v.deleted_at IS NULL
       ORDER BY v.display_order, v.id`,
      [id]
    ),
    run(
      `SELECT id, cdn_url AS "cdnUrl", display_order AS "displayOrder", alt_text AS "altText"
       FROM images
       WHERE item_id = $1 AND deleted_at IS NULL
       ORDER BY display_order, id`,
      [id]
    ),
  ]);

  return {
    ...(itemRes.rows[0] as Omit<Item, "occasions" | "tags" | "designColors" | "variants" | "images">),
    occasions: occasions.rows,
    designColors: designColors.rows,
    tags: tags.rows,
    variants: variants.rows,
    images: images.rows,
  } as Item;
}

/**
 * A seller's view of an item, built field by field (allowlist): a field added to the query later
 * stays hidden from sellers until it is listed here on purpose. forRole() still runs on top.
 */
export function toSellerItem(item: Item): ItemSellerView {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    itemTypeId: item.itemTypeId,
    itemTypeName: item.itemTypeName,
    wearType: item.wearType,
    status: item.status,
    isOneOfAKind: item.isOneOfAKind,
    sellingPrice: item.sellingPrice,
    captionText: item.captionText,
    createdAt: item.createdAt,
    createdBy: item.createdBy && { id: item.createdBy.id, name: item.createdBy.name },
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy && { id: item.updatedBy.id, name: item.updatedBy.name },
    version: item.version,
    occasions: item.occasions.map((o) => ({ id: o.id, name: o.name, createdAt: o.createdAt })),
    designColors: item.designColors.map((c) => ({ id: c.id, name: c.name, hexCode: c.hexCode, hexCode2: c.hexCode2, createdAt: c.createdAt })),
    tags: item.tags.map((t) => ({ id: t.id, name: t.name, createdAt: t.createdAt })),
    variants: item.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colorId: v.colorId,
      colorName: v.colorName,
      colorHex: v.colorHex,
      colorHex2: v.colorHex2,
      quantity: v.quantity,
      sellingPriceOverride: v.sellingPriceOverride,
      displayOrder: v.displayOrder,
    })),
    images: item.images.map((i) => ({ id: i.id, cdnUrl: i.cdnUrl, displayOrder: i.displayOrder, altText: i.altText })),
  };
}

/** The item as `role` may see it: the owner gets everything; sellers get the allowlisted view. */
export function viewFor(item: Item, role: Role): Item | ItemSellerView {
  return role === "owner" ? item : forRole(toSellerItem(item), role); // forRole: the safety net
}

export async function loadItem(id: string, role: Role, run: Run = viaPool): Promise<Item | ItemSellerView | null> {
  const item = await loadItemFull(id, run);
  return item && viewFor(item, role);
}
