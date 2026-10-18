import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { pool, query } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { LIST_STATUSES, ONE_SIZE, PAGE_SIZE, SEARCH_MAX, type InventoryItem, type InventoryPage } from "@/lib/inventory";
import { decodeCursor, encodeCursor, toPrefixQuery } from "@/lib/inventory-query";
import { DUPLICATE_VARIANT, isDuplicateVariantError, normalizeVariantSizes } from "@/lib/variants";

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALT_TEXT_MAX = 120;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const WEAR_TYPES = ["top", "bottom", "both"];
const STATUSES = ["active", "draft"];

type ImageBody = {
  base64: string;
  mimeType: string;
  displayOrder?: number;
  altText?: string | null;
};

type VariantBody = {
  size?: string;
  colorId?: string | null;
  quantity?: number;
  sellingPriceOverride?: number | null;
  costPriceOverride?: number | null;
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

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

  const {
    title,
    description,
    itemTypeId,
    wearType,
    costPrice,
    sellingPrice,
    occasionIds = [],
    tagIds = [],
    variants = [],
    images = [],
    status = "active",
    isOneOfAKind = false,
  } = body ?? {};

  // ---- Validation ----
  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (String(title).trim().length > 150) {
    return NextResponse.json({ error: "Title must be 150 characters or less" }, { status: 400 });
  }
  if (description && String(description).length > 500) {
    return NextResponse.json({ error: "Description must be 500 characters or less" }, { status: 400 });
  }
  if (!WEAR_TYPES.includes(wearType)) {
    return NextResponse.json({ error: "Wear type is required" }, { status: 400 });
  }
  if (!isNum(sellingPrice) || sellingPrice <= 0) {
    return NextResponse.json({ error: "Selling price must be greater than 0" }, { status: 400 });
  }
  if (costPrice != null && (!isNum(costPrice) || costPrice < 0)) {
    return NextResponse.json({ error: "Invalid cost price" }, { status: 400 });
  }
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!Array.isArray(occasionIds) || !Array.isArray(tagIds) || !Array.isArray(variants) || !Array.isArray(images)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  for (const v of variants as VariantBody[]) {
    if (!v.size || !String(v.size).trim()) {
      return NextResponse.json({ error: "Each variant needs a size" }, { status: 400 });
    }
    if (!Number.isInteger(v.quantity) || (v.quantity as number) < 0) {
      return NextResponse.json({ error: "Variant quantity must be 0 or more" }, { status: 400 });
    }
    for (const o of [v.sellingPriceOverride, v.costPriceOverride]) {
      if (o != null && (!isNum(o) || o < 0)) {
        return NextResponse.json({ error: "Invalid price override" }, { status: 400 });
      }
    }
  }
  // One spelling per size ("xl" → "XL"); each size + colour once (the DB enforces it too).
  if (normalizeVariantSizes(variants as VariantBody[]) === "duplicate") {
    return NextResponse.json({ error: DUPLICATE_VARIANT }, { status: 400 });
  }
  if (typeof isOneOfAKind !== "boolean") {
    return NextResponse.json({ error: "Invalid one-of-a-kind flag" }, { status: 400 });
  }
  if (isOneOfAKind) {
    const [only] = variants as VariantBody[];
    if (variants.length !== 1 || only.colorId != null || String(only.size).trim() !== ONE_SIZE) {
      return NextResponse.json({ error: "A one-of-a-kind item is a single piece, with no sizes or colours." }, { status: 400 });
    }
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `A maximum of ${MAX_IMAGES} images is allowed` }, { status: 400 });
  }

  const decoded: { buffer: Buffer; mimeType: string; displayOrder: number; altText: string | null }[] = [];
  for (const [i, img] of Array.from((images as ImageBody[]).entries())) {
    const mimeType = img?.mimeType;
    if (!MIME_EXT[mimeType]) {
      return NextResponse.json({ error: "Images must be JPEG, PNG or WebP" }, { status: 400 });
    }
    if (typeof img.base64 !== "string") {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }
    if (img.altText != null && (typeof img.altText !== "string" || img.altText.length > ALT_TEXT_MAX)) {
      return NextResponse.json({ error: `Photo descriptions must be ${ALT_TEXT_MAX} characters or less` }, { status: 400 });
    }
    const raw = img.base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Each image must be 5MB or smaller" }, { status: 400 });
    }
    decoded.push({
      buffer,
      mimeType,
      displayOrder: isNum(img.displayOrder) ? img.displayOrder : i,
      altText: img.altText ? img.altText.trim() || null : null,
    });
  }

  // ---- Transaction ----
  const writtenFiles: string[] = [];
  let writtenDir: string | null = null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const itemRes = await client.query(
      `INSERT INTO items
         (id, title, description, item_type_id, wear_type, cost_price, selling_price,
          status, created_by, updated_by, created_at, updated_at, is_one_of_a_kind)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $8, NOW(), NOW(), $9)
       RETURNING id, title, status, created_at AS "createdAt"`,
      [
        String(title).trim(),
        description ? String(description).trim() : null,
        itemTypeId || null,
        wearType,
        canSeeCost ? costPrice ?? null : null,
        sellingPrice,
        status,
        userId,
        isOneOfAKind,
      ]
    );
    const item = itemRes.rows[0];
    const itemId: string = item.id;

    for (const [i, v] of Array.from((variants as VariantBody[]).entries())) {
      await client.query(
        `INSERT INTO variants
           (id, item_id, size, color_id, quantity, selling_price_override,
            cost_price_override, display_order, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $8, NOW(), NOW())`,
        [
          itemId,
          String(v.size).trim(),
          v.colorId || null,
          v.quantity,
          v.sellingPriceOverride ?? null,
          canSeeCost ? v.costPriceOverride ?? null : null,
          i,
          userId,
        ]
      );
    }

    for (const occasionId of Array.from(new Set<string>(occasionIds))) {
      await client.query(
        `INSERT INTO item_occasions (item_id, occasion_id, created_by, created_at, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW(), $3, NOW())`,
        [itemId, occasionId, userId]
      );
    }
    for (const tagId of Array.from(new Set<string>(tagIds))) {
      await client.query(
        `INSERT INTO item_tags (item_id, tag_id, created_by, created_at, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW(), $3, NOW())`,
        [itemId, tagId, userId]
      );
    }

    if (decoded.length > 0) {
      writtenDir = path.join(process.cwd(), "public", "uploads", "items", itemId);
      fs.mkdirSync(writtenDir, { recursive: true });
      for (const img of decoded) {
        const fileName = `${randomUUID()}.${MIME_EXT[img.mimeType]}`;
        const filePath = path.join(writtenDir, fileName);
        fs.writeFileSync(filePath, img.buffer);
        writtenFiles.push(filePath);
        const relPath = `/uploads/items/${itemId}/${fileName}`;
        await client.query(
          `INSERT INTO images
             (id, item_id, s3_key, cdn_url, mime_type, size_bytes, display_order, alt_text,
              created_by, updated_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())`,
          [itemId, relPath, img.mimeType, img.buffer.length, img.displayOrder, img.altText, userId]
        );
      }
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
    for (const f of writtenFiles) {
      try {
        fs.unlinkSync(f);
      } catch {}
    }
    if (writtenDir) {
      try {
        fs.rmdirSync(writtenDir);
      } catch {}
    }
    if (isDuplicateVariantError(error)) {
      return NextResponse.json({ error: DUPLICATE_VARIANT }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") {
      console.error("POST /api/items failed:", error);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
