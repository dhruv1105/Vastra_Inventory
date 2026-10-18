import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { LIST_STATUSES, PAGE_SIZE, SEARCH_MAX, type InventoryItem, type InventoryPage } from "@/lib/inventory";
import { decodeCursor, encodeCursor, toPrefixQuery } from "@/lib/inventory-query";
import {
  MAX_IMAGES,
  ONE_OF_A_KIND_SHAPE,
  TOO_MANY_IMAGES,
  WrittenFiles,
  decodeImages,
  insertImage,
  isSinglePiece,
  readItemFields,
  readVariants,
  writeErrorMessage,
} from "@/lib/item-input";

const STATUSES = ["active", "draft"];

/**
 * The inventory list: live items (not archived), newest first, 20 per page.
 *   ?q=      title search, by word prefix ("lav geo"), on the GIN index items_live_title_search_idx
 *   ?cursor= the nextCursor of the previous page
 * One query per page: cover photo, stock and the lowest variant price come from LATERAL joins.
 * Read-only, and never selects cost prices — for the owner as well as sellers.
 */
export async function GET(request: Request) {
  const g = await requireUser(request);
  if (g.response) return g.response;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  if (q.length > SEARCH_MAX) {
    return NextResponse.json({ error: `Search is too long (${SEARCH_MAX} characters at most).` }, { status: 400 });
  }
  const rawCursor = params.get("cursor");
  const cursor = rawCursor ? decodeCursor(rawCursor) : null;
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "This list is out of date. Reload the page." }, { status: 400 });
  }

  const values: unknown[] = [LIST_STATUSES];
  const where = ["i.deleted_at IS NULL", "i.status = ANY($1::text[])"];
  const tsquery = toPrefixQuery(q);
  if (tsquery) {
    values.push(tsquery);
    // Must match the index expression exactly (db/schema.ts) for Postgres to use it.
    where.push(`to_tsvector('simple', i.title) @@ to_tsquery('simple', $${values.length})`);
  }
  if (cursor) {
    // Row comparison on (created_at, id): items saved in one transaction share created_at
    // (NOW() is the transaction start), so created_at alone would skip or repeat them.
    values.push(cursor.createdAt, cursor.id);
    where.push(`(i.created_at, i.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`);
  }
  values.push(PAGE_SIZE + 1); // one extra row says whether there is a next page

  try {
    const { rows } = await query(
      `SELECT i.id, i.title, i.status,
              t.name AS "itemTypeName",
              i.selling_price::float8 AS "sellingPrice",
              CASE WHEN v.min_override < i.selling_price THEN v.min_override::float8 END AS "fromPrice",
              img.cdn_url AS "coverUrl", img.alt_text AS "coverAlt",
              COALESCE(v.total, 0)::int AS "totalStock",
              v.n::int AS "variantCount",
              i.is_one_of_a_kind AS "isOneOfAKind",
              i.created_at::text AS "cursorAt"
       FROM items i
       LEFT JOIN item_types t ON t.id = i.item_type_id
       LEFT JOIN LATERAL (
         SELECT cdn_url, alt_text FROM images
         WHERE item_id = i.id AND deleted_at IS NULL
         ORDER BY display_order, id
         LIMIT 1
       ) img ON true
       LEFT JOIN LATERAL (
         SELECT SUM(quantity) AS total, COUNT(*) AS n, MIN(selling_price_override) AS min_override
         FROM variants
         WHERE item_id = i.id AND deleted_at IS NULL
       ) v ON true
       WHERE ${where.join(" AND ")}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT $${values.length}`,
      values
    );

    const page = rows.slice(0, PAGE_SIZE);
    const last = page[page.length - 1];
    const data: InventoryPage = {
      items: page.map(
        (r): InventoryItem => ({
          id: r.id,
          title: r.title,
          status: r.status,
          itemTypeName: r.itemTypeName,
          sellingPrice: r.sellingPrice,
          fromPrice: r.fromPrice,
          coverUrl: r.coverUrl,
          coverAlt: r.coverAlt,
          totalStock: r.totalStock,
          variantCount: r.variantCount,
          isOneOfAKind: r.isOneOfAKind === true,
        })
      ),
      nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor({ createdAt: last.cursorAt, id: last.id }) : null,
    };
    return NextResponse.json({ data });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("GET /api/items failed:", error);
    }
    return NextResponse.json({ error: "Could not load the inventory. Try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Owner and sellers may add items. Who is acting comes from the session, never the body.
  const g = await requireUser(request);
  if (g.response) return g.response;
  const userId = g.user.id;
  // Sellers never see or set cost prices.
  const canSeeCost = g.user.role === "owner";

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { variants: rawVariants = [], images: rawImages = [], status = "active", isOneOfAKind = false } = body;
  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

  // ---- Validation (shared with edit: lib/item-input.ts) ----
  const fields = readItemFields(body);
  if (fields.error !== undefined) return bad(fields.error);
  if (!STATUSES.includes(status)) return bad("Invalid status");
  if (!Array.isArray(rawImages)) return bad("Invalid request body");
  const checked = readVariants(rawVariants, { withQuantity: true });
  if (checked.error !== undefined) return bad(checked.error);
  const variants = checked.value;
  if (typeof isOneOfAKind !== "boolean") return bad("Invalid one-of-a-kind flag");
  if (isOneOfAKind && !isSinglePiece(variants)) return bad(ONE_OF_A_KIND_SHAPE);
  if (rawImages.length > MAX_IMAGES) return bad(TOO_MANY_IMAGES);
  const images = decodeImages(rawImages);
  if (images.error !== undefined) return bad(images.error);
  const f = fields.value;

  // ---- Transaction ----
  const files = new WrittenFiles();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const itemRes = await client.query(
      `INSERT INTO items
         (id, title, description, item_type_id, wear_type, cost_price, selling_price,
          status, created_by, updated_by, created_at, updated_at, is_one_of_a_kind)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $8, NOW(), NOW(), $9)
       RETURNING id, title, status, created_at AS "createdAt"`,
      [f.title, f.description, f.itemTypeId, f.wearType, canSeeCost ? f.costPrice : null, f.sellingPrice, status, userId, isOneOfAKind]
    );
    const item = itemRes.rows[0];
    const itemId: string = item.id;

    for (const [i, v] of Array.from(variants.entries())) {
      await client.query(
        `INSERT INTO variants
           (id, item_id, size, color_id, quantity, selling_price_override,
            cost_price_override, display_order, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $8, NOW(), NOW())`,
        [itemId, v.size, v.colorId, v.quantity, v.sellingPriceOverride, canSeeCost ? v.costPriceOverride : null, i, userId]
      );
    }

    for (const occasionId of f.occasionIds) {
      await client.query(
        `INSERT INTO item_occasions (item_id, occasion_id, created_by, created_at, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW(), $3, NOW())`,
        [itemId, occasionId, userId]
      );
    }
    for (const tagId of f.tagIds) {
      await client.query(
        `INSERT INTO item_tags (item_id, tag_id, created_by, created_at, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW(), $3, NOW())`,
        [itemId, tagId, userId]
      );
    }

    for (const img of images.value) {
      await insertImage(client, files, itemId, img, img.displayOrder, userId);
    }

    await client.query(
      `INSERT INTO activity_log (id, actor_id, action, entity_type, entity_id, payload, created_by, created_at)
       VALUES (gen_random_uuid(), $1, 'item.created', 'item', $2, $3, $1, NOW())`,
      [userId, itemId, JSON.stringify({ title: item.title, variantCount: variants.length })]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        data: {
          id: itemId,
          title: item.title,
          status: item.status,
          createdAt: item.createdAt,
          variantCount: variants.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    files.undo();
    const known = writeErrorMessage(error);
    if (known) return bad(known);
    if (process.env.NODE_ENV === "development") {
      console.error("POST /api/items failed:", error);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
