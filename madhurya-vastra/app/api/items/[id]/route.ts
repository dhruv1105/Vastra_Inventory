import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, UUID as UUID_REGEX } from "@/lib/auth/guard";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  try {
    const itemRes = await query(
      `SELECT i.id, i.title, i.description, i.item_type_id AS "itemTypeId",
              t.name AS "itemTypeName", i.wear_type AS "wearType",
              i.cost_price::float8 AS "costPrice", i.selling_price::float8 AS "sellingPrice",
              i.status, i.caption_text AS "captionText",
              i.created_at AS "createdAt", i.created_by AS "createdBy"
       FROM items i
       LEFT JOIN item_types t ON t.id = i.item_type_id
       WHERE i.id = $1 AND i.deleted_at IS NULL`,
      [id]
    );
    if (itemRes.rows.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const [occasions, tags, variants, images] = await Promise.all([
      query(
        `SELECT o.id, o.name, o.created_at AS "createdAt"
         FROM item_occasions io JOIN occasions o ON o.id = io.occasion_id
         WHERE io.item_id = $1 ORDER BY o.name`,
        [id]
      ),
      query(
        `SELECT t.id, t.name, t.created_at AS "createdAt"
         FROM item_tags it JOIN tags t ON t.id = it.tag_id
         WHERE it.item_id = $1 ORDER BY t.name`,
        [id]
      ),
      query(
        `SELECT v.id, v.size, v.color_id AS "colorId", c.name AS "colorName",
                c.hex_code AS "colorHex", v.quantity,
                v.selling_price_override::float8 AS "sellingPriceOverride"
         FROM variants v LEFT JOIN colors c ON c.id = v.color_id
         WHERE v.item_id = $1 AND v.deleted_at IS NULL
         ORDER BY v.display_order`,
        [id]
      ),
      query(
        `SELECT id, cdn_url AS "cdnUrl", display_order AS "displayOrder", alt_text AS "altText"
         FROM images
         WHERE item_id = $1 AND deleted_at IS NULL
         ORDER BY display_order`,
        [id]
      ),
    ]);

    // Cost price is staff-private: only the owner receives it.
    const { costPrice, ...item } = itemRes.rows[0];
    return NextResponse.json({
      data: {
        ...item,
        ...(g.user.role === "owner" ? { costPrice } : {}),
        occasions: occasions.rows,
        tags: tags.rows,
        variants: variants.rows,
        images: images.rows,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
