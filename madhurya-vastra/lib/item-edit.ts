import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { UUID, type GuardUser } from "@/lib/auth/guard";
import { logActivity } from "@/lib/activity";
import { PG_TIMESTAMPTZ } from "@/lib/inventory-query";
import { OUT_OF_DATE, STALE } from "@/lib/item-status";
import { loadItemFull, viaClient, viewFor } from "@/lib/items";
import { sizeKey } from "@/lib/sizes";
import {
  MAX_IMAGES,
  TOO_MANY_IMAGES,
  WrittenFiles,
  decodeImages,
  insertImage,
  isSinglePiece,
  readAltText,
  readItemFields,
  readVariants,
  writeErrorMessage,
  type NewImage,
} from "@/lib/item-input";
import type { Item, VariantDetail } from "@/types";

// PATCH /api/items/[id]: one save of the edit form, in one transaction.
//   - version: the item's updated_at as text, compared in SQL; a stale one → 409, nothing written.
//   - variants: the full desired list, matched to the live rows by size (case/spacing ignored) + colour.
//     New ones start at quantity 0; quantities sent are ignored (stock moves through its own actions);
//     a removed one is soft-deleted, refused while it still has stock.
//   - images: { keep: [{ id, displayOrder, altText }], add: [{ base64, mimeType, displayOrder, altText }] };
//     photos not kept are soft-deleted (files stay on disk until the S3 step).
//   - Sellers can't change cost prices: theirs are ignored and the stored ones kept.
//   - activity_log item.updated: before/after of what changed (cost included; reads filter it).

export const ONE_OF_A_KIND_LOCKED =
  "This item is one of a kind: a single piece with no sizes or colours. Turn one of a kind off to add sizes or colours.";
export const NO_TURN_ON = "An item can't be made one of a kind after it is saved.";
export const COLOUR_FOR_PIECE = "Choose the piece's colour to turn one of a kind off.";
export const PHOTO_GONE = "A photo on this page is no longer there. Reload and try again.";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const key = (size: string, colorId: string | null) => `${sizeKey(size)}|${colorId ?? ""}`;
const label = (v: { size: string; colorName: string | null }) => (v.colorName ? `${v.size} × ${v.colorName}` : v.size);

type KeepPhoto = { id: string; displayOrder: number; altText: string | null };

export async function editItem(id: string, raw: unknown, user: GuardUser): Promise<NextResponse> {
  if (!raw || typeof raw !== "object") return bad("Invalid request body");
  const body = raw as Record<string, unknown>;
  const owner = user.role === "owner";

  // ---- Validation (shared rules: lib/item-input.ts) ----
  const version = body.version;
  if (typeof version !== "string" || !PG_TIMESTAMPTZ.test(version)) return bad(OUT_OF_DATE);
  const fields = readItemFields(body);
  if (fields.error !== undefined) return bad(fields.error);
  const desired = readVariants(body.variants, { withQuantity: false });
  if (desired.error !== undefined) return bad(desired.error);
  if (typeof body.isOneOfAKind !== "boolean") return bad("Invalid one-of-a-kind flag");
  const pieceColorId = body.oneOfAKindColorId;
  if (pieceColorId != null && !isId(pieceColorId)) return bad("Invalid colour");

  const images = body.images as { keep?: unknown; add?: unknown } | undefined;
  if (!images || typeof images !== "object" || !Array.isArray(images.keep) || !Array.isArray(images.add)) {
    return bad("Invalid request body");
  }
  const keep: KeepPhoto[] = [];
  for (const [i, k] of Array.from((images.keep as Record<string, unknown>[]).entries())) {
    const altText = readAltText(k?.altText);
    if (!k || !isId(k.id) || altText === undefined) return bad("Invalid photo");
    const order = typeof k.displayOrder === "number" && Number.isFinite(k.displayOrder) ? k.displayOrder : i;
    keep.push({ id: k.id, displayOrder: order, altText });
  }
  if (new Set(keep.map((k) => k.id)).size !== keep.length) return bad("Invalid photo");
  if (keep.length + images.add.length > MAX_IMAGES) return bad(TOO_MANY_IMAGES);
  const added = decodeImages(images.add);
  if (added.error !== undefined) return bad(added.error);

  const f = fields.value;
  const files = new WrittenFiles();
  const client = await pool.connect();
  const run = viaClient(client);
  const rollback = async (res: NextResponse) => {
    await client.query("ROLLBACK");
    return res;
  };

  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT (updated_at = $2::timestamptz) AS fresh FROM items WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id, version],
    );
    if (lock.rows.length === 0) return await rollback(bad("Item not found", 404));
    if (!lock.rows[0].fresh) return await rollback(bad(STALE, 409));
    const before = (await loadItemFull(id, run)) as Item;

    // ---- One of a kind: stays a single piece, or turns off by giving the piece a colour ----
    const current = before.variants.map((v) => ({ ...v }));
    let converted: VariantDetail | null = null;
    if (before.isOneOfAKind && body.isOneOfAKind) {
      if (!isSinglePiece(desired.value)) return await rollback(bad(ONE_OF_A_KIND_LOCKED));
    } else if (before.isOneOfAKind && !body.isOneOfAKind) {
      if (!isId(pieceColorId)) return await rollback(bad(COLOUR_FOR_PIECE));
      converted = current.find((v) => v.colorId == null && isSinglePiece([v])) ?? null;
      if (converted) converted.colorId = pieceColorId; // same row, same quantity; written below
    } else if (!before.isOneOfAKind && body.isOneOfAKind) {
      return await rollback(bad(NO_TURN_ON));
    }

    // ---- Variant plan ----
    const want = new Map(desired.value.map((v) => [key(v.size, v.colorId), v]));
    const have = new Map(current.map((v) => [key(v.size, v.colorId), v]));
    const removed = current.filter((v) => !want.has(key(v.size, v.colorId)));
    const stocked = removed.filter((v) => v.quantity > 0);
    if (stocked.length > 0) {
      const list = stocked.map((v) => `${label(v)} (${v.quantity} left)`).join(", ");
      return await rollback(bad(`These still have stock, so they can't be removed: ${list}.`));
    }
    const toAdd = desired.value.filter((v) => !have.has(key(v.size, v.colorId)));
    const toUpdate = current
      .map((v) => ({ v, d: want.get(key(v.size, v.colorId)) }))
      .filter((x): x is { v: VariantDetail; d: (typeof desired.value)[number] } => x.d !== undefined)
      .map(({ v, d }) => ({
        id: v.id,
        colorId: v.colorId,
        selling: d.sellingPriceOverride,
        cost: owner ? d.costPriceOverride : v.costPriceOverride ?? null, // sellers keep the stored cost
        changed:
          v === converted ||
          d.sellingPriceOverride !== v.sellingPriceOverride ||
          (owner && d.costPriceOverride !== (v.costPriceOverride ?? null)),
      }))
      .filter((u) => u.changed);

    // ---- Photo plan ----
    const live = new Map(before.images.map((img) => [img.id, img]));
    if (keep.some((k) => !live.has(k.id))) return await rollback(bad(PHOTO_GONE));
    const kept = new Set(keep.map((k) => k.id));
    const droppedPhotos = before.images.filter((img) => !kept.has(img.id));
    type Slot = { order: number; keep?: KeepPhoto; add?: NewImage };
    const slots: Slot[] = [
      ...keep.map((k) => ({ order: k.displayOrder, keep: k })),
      ...added.value.map((a) => ({ order: a.displayOrder, add: a })),
    ].sort((a, b) => a.order - b.order); // stable: kept photos first on a tie
    const photoEdits = slots
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => s.keep && (live.get(s.keep.id)!.displayOrder !== i || live.get(s.keep.id)!.altText !== s.keep.altText));

    // ---- Fields ----
    const costPrice = owner ? f.costPrice : before.costPrice ?? null;
    const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
    const occasionsBefore = before.occasions.map((o) => o.id);
    const tagsBefore = before.tags.map((t) => t.id);
    const fieldsChanged =
      f.title !== before.title ||
      f.description !== (before.description ?? null) ||
      f.itemTypeId !== (before.itemTypeId ?? null) ||
      f.wearType !== before.wearType ||
      f.sellingPrice !== before.sellingPrice ||
      costPrice !== (before.costPrice ?? null) ||
      body.isOneOfAKind !== before.isOneOfAKind ||
      !sameSet(f.occasionIds, occasionsBefore) ||
      !sameSet(f.tagIds, tagsBefore);

    const nothingToDo =
      !fieldsChanged && removed.length + toAdd.length + toUpdate.length + droppedPhotos.length + added.value.length + photoEdits.length === 0;
    if (nothingToDo) {
      await client.query("ROLLBACK"); // nothing changed: no write, same version
      return NextResponse.json({ data: viewFor(before, user.role) });
    }

    // ---- Writes ----
    for (const v of removed) {
      await client.query(`UPDATE variants SET deleted_at = now(), updated_at = now(), updated_by = $2 WHERE id = $1`, [v.id, user.id]);
    }
    for (const u of toUpdate) {
      await client.query(
        `UPDATE variants SET color_id = $2, selling_price_override = $3, cost_price_override = $4, updated_at = now(), updated_by = $5
         WHERE id = $1`,
        [u.id, u.colorId, u.selling, u.cost, user.id],
      );
    }
    let order = Math.max(-1, ...before.variants.map((v) => v.displayOrder)) + 1;
    for (const v of toAdd) {
      await client.query(
        `INSERT INTO variants (item_id, size, color_id, quantity, selling_price_override, cost_price_override, display_order, created_by, updated_by)
         VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $7)`,
        [id, v.size, v.colorId, v.sellingPriceOverride, owner ? v.costPriceOverride : null, order++, user.id],
      );
    }

    const addOccasions = f.occasionIds.filter((x) => !occasionsBefore.includes(x));
    const dropOccasions = occasionsBefore.filter((x) => !f.occasionIds.includes(x));
    if (dropOccasions.length) await client.query(`DELETE FROM item_occasions WHERE item_id = $1 AND occasion_id = ANY($2::uuid[])`, [id, dropOccasions]);
    for (const o of addOccasions) {
      await client.query(`INSERT INTO item_occasions (item_id, occasion_id, created_by, updated_by) VALUES ($1, $2, $3, $3)`, [id, o, user.id]);
    }
    const addTags = f.tagIds.filter((x) => !tagsBefore.includes(x));
    const dropTags = tagsBefore.filter((x) => !f.tagIds.includes(x));
    if (dropTags.length) await client.query(`DELETE FROM item_tags WHERE item_id = $1 AND tag_id = ANY($2::uuid[])`, [id, dropTags]);
    for (const t of addTags) {
      await client.query(`INSERT INTO item_tags (item_id, tag_id, created_by, updated_by) VALUES ($1, $2, $3, $3)`, [id, t, user.id]);
    }

    if (droppedPhotos.length) {
      await client.query(`UPDATE images SET deleted_at = now(), updated_at = now(), updated_by = $2 WHERE id = ANY($1::uuid[])`, [
        droppedPhotos.map((p) => p.id),
        user.id,
      ]);
    }
    for (const { s, i } of photoEdits) {
      await client.query(`UPDATE images SET display_order = $2, alt_text = $3, updated_at = now(), updated_by = $4 WHERE id = $1`, [
        s.keep!.id,
        i,
        s.keep!.altText,
        user.id,
      ]);
    }
    for (const [i, s] of Array.from(slots.entries())) {
      if (s.add) await insertImage(client, files, id, s.add, i, user.id);
    }

    await client.query(
      `UPDATE items SET title = $2, description = $3, item_type_id = $4, wear_type = $5, selling_price = $6, cost_price = $7,
              is_one_of_a_kind = $8, updated_at = now(), updated_by = $9
       WHERE id = $1`,
      [id, f.title, f.description, f.itemTypeId, f.wearType, f.sellingPrice, costPrice, body.isOneOfAKind, user.id],
    );

    const after = (await loadItemFull(id, run)) as Item;
    await logActivity(client, { actorId: user.id, action: "item.updated", entityType: "item", entityId: id, payload: diffItems(before, after) });
    await client.query("COMMIT");
    return NextResponse.json({ data: viewFor(after, user.role) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    files.undo();
    const known = writeErrorMessage(error);
    if (known) return bad(known);
    if (process.env.NODE_ENV === "development") console.error("PATCH /api/items/[id] failed:", error);
    return bad("The change was not saved. Try again.", 500);
  } finally {
    client.release();
  }
}

const SCALARS = ["title", "description", "itemTypeName", "wearType", "sellingPrice", "costPrice", "isOneOfAKind"] as const;
const VARIANT_FIELDS = ["colorName", "sellingPriceOverride", "costPriceOverride"] as const;

/**
 * What one save changed, in words a history screen can show: names, not ids.
 * Cost fields are included (the owner's history needs them); readActivity() filters them for sellers.
 */
export function diffItems(before: Item, after: Item) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of SCALARS) {
    if ((before[k] ?? null) !== (after[k] ?? null)) {
      b[k] = before[k] ?? null;
      a[k] = after[k] ?? null;
    }
  }
  for (const k of ["occasions", "tags"] as const) {
    const was = before[k].map((x) => x.name);
    const now = after[k].map((x) => x.name);
    if (was.join("\n") !== now.join("\n")) {
      b[k] = was;
      a[k] = now;
    }
  }

  const ids = new Set(after.variants.map((v) => v.id));
  const old = new Map(before.variants.map((v) => [v.id, v]));
  const variants = {
    added: after.variants.filter((v) => !old.has(v.id)).map(label),
    removed: before.variants.filter((v) => !ids.has(v.id)).map(label),
    changed: after.variants.flatMap((v) => {
      const o = old.get(v.id);
      if (!o) return [];
      const vb: Record<string, unknown> = {};
      const va: Record<string, unknown> = {};
      for (const k of VARIANT_FIELDS) {
        if ((o[k] ?? null) !== (v[k] ?? null)) {
          vb[k] = o[k] ?? null;
          va[k] = v[k] ?? null;
        }
      }
      return Object.keys(va).length ? [{ variant: label(o), before: vb, after: va }] : [];
    }),
  };

  const photoIds = new Set(after.images.map((p) => p.id));
  const oldPhotos = new Map(before.images.map((p) => [p.id, p]));
  const photos = {
    added: after.images.filter((p) => !oldPhotos.has(p.id)).length,
    removed: before.images.filter((p) => !photoIds.has(p.id)).length,
    edited: after.images.filter((p) => {
      const o = oldPhotos.get(p.id);
      return o && (o.displayOrder !== p.displayOrder || o.altText !== p.altText);
    }).length,
  };

  return {
    before: b,
    after: a,
    ...(variants.added.length + variants.removed.length + variants.changed.length ? { variants } : {}),
    ...(photos.added + photos.removed + photos.edited ? { photos } : {}),
  };
}
