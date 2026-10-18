import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { UUID } from "@/lib/auth/guard";
import { ONE_SIZE } from "@/lib/inventory";
import { DUPLICATE_VARIANT, isDuplicateVariantError, normalizeVariantSizes } from "@/lib/variants";
import type { WearType } from "@/types";

// Server-side checks and photo writing shared by POST /api/items (Add Item) and
// PATCH /api/items/[id] (edit), so both accept and refuse the same things with the same words.

export const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALT_TEXT_MAX = 120;
const SIZE_MAX = 20; // variants.size is varchar(20)
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const WEAR_TYPES = ["top", "bottom", "both"];

export const ONE_OF_A_KIND_SHAPE = "A one-of-a-kind item is a single piece, with no sizes or colours.";
export const MISSING_LOOKUP = "A chosen type, colour, occasion or tag no longer exists. Reload and try again.";
export const TOO_MANY_IMAGES = `A maximum of ${MAX_IMAGES} images is allowed`;

export type Checked<T> = { value: T; error?: undefined } | { error: string; value?: undefined };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type ItemFields = {
  title: string;
  description: string | null;
  itemTypeId: string | null;
  wearType: WearType;
  sellingPrice: number;
  costPrice: number | null;
  occasionIds: string[];
  tagIds: string[];
};

/** Title, description, type, wear type, prices, occasions and tags. */
export function readItemFields(body: Record<string, unknown>): Checked<ItemFields> {
  const { title, description, itemTypeId, wearType, sellingPrice, costPrice, occasionIds = [], tagIds = [] } = body;
  if (!title || !String(title).trim()) return { error: "Title is required" };
  if (String(title).trim().length > 150) return { error: "Title must be 150 characters or less" };
  if (description && String(description).length > 500) return { error: "Description must be 500 characters or less" };
  if (typeof wearType !== "string" || !WEAR_TYPES.includes(wearType)) return { error: "Wear type is required" };
  if (!isNum(sellingPrice) || sellingPrice <= 0) return { error: "Selling price must be greater than 0" };
  if (costPrice != null && (!isNum(costPrice) || costPrice < 0)) return { error: "Invalid cost price" };
  if (itemTypeId != null && itemTypeId !== "" && !isId(itemTypeId)) return { error: "Invalid item type" };
  if (!Array.isArray(occasionIds) || !Array.isArray(tagIds)) return { error: "Invalid request body" };
  if (!occasionIds.every(isId) || !tagIds.every(isId)) return { error: "Invalid occasion or tag" };
  return {
    value: {
      title: String(title).trim(),
      description: description ? String(description).trim() || null : null,
      itemTypeId: (itemTypeId as string) || null,
      wearType: wearType as WearType,
      sellingPrice,
      costPrice: costPrice ?? null,
      occasionIds: Array.from(new Set(occasionIds)),
      tagIds: Array.from(new Set(tagIds)),
    },
  };
}

export type VariantFields = {
  size: string;
  colorId: string | null;
  quantity: number;
  sellingPriceOverride: number | null;
  costPriceOverride: number | null;
};

/**
 * The variant list: sizes normalised ("xl" → "XL"), each size + colour once.
 * `withQuantity: false` (edit) ignores quantities — stock only moves through its own actions.
 */
export function readVariants(raw: unknown, { withQuantity }: { withQuantity: boolean }): Checked<VariantFields[]> {
  if (!Array.isArray(raw)) return { error: "Invalid request body" };
  const out: VariantFields[] = [];
  for (const v of raw as Record<string, unknown>[]) {
    if (!v || typeof v !== "object") return { error: "Invalid request body" };
    if ((typeof v.size !== "string" && typeof v.size !== "number") || !String(v.size).trim()) {
      return { error: "Each variant needs a size" };
    }
    if (String(v.size).trim().length > SIZE_MAX) return { error: `Sizes must be ${SIZE_MAX} characters or less` };
    if (v.colorId != null && v.colorId !== "" && !isId(v.colorId)) return { error: "Invalid colour" };
    if (withQuantity && (!Number.isInteger(v.quantity) || (v.quantity as number) < 0)) {
      return { error: "Variant quantity must be 0 or more" };
    }
    for (const o of [v.sellingPriceOverride, v.costPriceOverride]) {
      if (o != null && (!isNum(o) || o < 0)) return { error: "Invalid price override" };
    }
    out.push({
      size: String(v.size),
      colorId: (v.colorId as string) || null,
      quantity: withQuantity ? (v.quantity as number) : 0,
      sellingPriceOverride: (v.sellingPriceOverride as number | null) ?? null,
      costPriceOverride: (v.costPriceOverride as number | null) ?? null,
    });
  }
  if (normalizeVariantSizes(out) === "duplicate") return { error: DUPLICATE_VARIANT };
  return { value: out };
}

/** A one-of-a-kind item is exactly one "One Size" piece with no colour. */
export const isSinglePiece = (variants: { size: string; colorId: string | null }[]) =>
  variants.length === 1 && variants[0].colorId == null && variants[0].size === ONE_SIZE;

export type NewImage = { buffer: Buffer; mimeType: string; displayOrder: number; altText: string | null };

/** Checks and decodes uploaded photos (type, size, description). The caller checks the count. */
export function decodeImages(raw: unknown): Checked<NewImage[]> {
  if (!Array.isArray(raw)) return { error: "Invalid request body" };
  const out: NewImage[] = [];
  for (const [i, img] of Array.from((raw as Record<string, unknown>[]).entries())) {
    const mimeType = img?.mimeType as string;
    if (!MIME_EXT[mimeType]) return { error: "Images must be JPEG, PNG or WebP" };
    if (typeof img.base64 !== "string") return { error: "Invalid image data" };
    const alt = readAltText(img.altText);
    if (alt === undefined) return { error: `Photo descriptions must be ${ALT_TEXT_MAX} characters or less` };
    const buffer = Buffer.from(img.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (buffer.length === 0) return { error: "Invalid image data" };
    if (buffer.length > MAX_IMAGE_BYTES) return { error: "Each image must be 5MB or smaller" };
    out.push({ buffer, mimeType, displayOrder: isNum(img.displayOrder) ? img.displayOrder : i, altText: alt });
  }
  return { value: out };
}

/** A photo description: trimmed text or null; undefined when it isn't valid. */
export function readAltText(raw: unknown): string | null | undefined {
  if (raw == null) return null;
  if (typeof raw !== "string" || raw.length > ALT_TEXT_MAX) return undefined;
  return raw.trim() || null;
}

/** Photo files written during one save, so a failed save can remove them again. */
export class WrittenFiles {
  private files: string[] = [];
  private dir: string | null = null;
  private dirCreated = false;

  /** Writes the file under public/uploads/items/<itemId>/ and returns its public path. */
  write(itemId: string, img: NewImage): string {
    if (!this.dir) {
      this.dir = path.join(process.cwd(), "public", "uploads", "items", itemId);
      this.dirCreated = !fs.existsSync(this.dir);
      fs.mkdirSync(this.dir, { recursive: true });
    }
    const fileName = `${randomUUID()}.${MIME_EXT[img.mimeType]}`;
    const filePath = path.join(this.dir, fileName);
    fs.writeFileSync(filePath, img.buffer);
    this.files.push(filePath);
    return `/uploads/items/${itemId}/${fileName}`;
  }

  /** Removes what this save wrote (and the folder, if this save created it). */
  undo() {
    for (const f of this.files) {
      try {
        fs.unlinkSync(f);
      } catch {}
    }
    if (this.dir && this.dirCreated) {
      try {
        fs.rmdirSync(this.dir);
      } catch {}
    }
  }
}

/** Writes the file and its images row. */
export async function insertImage(client: PoolClient, files: WrittenFiles, itemId: string, img: NewImage, displayOrder: number, userId: string) {
  const relPath = files.write(itemId, img);
  await client.query(
    `INSERT INTO images
       (id, item_id, s3_key, cdn_url, mime_type, size_bytes, display_order, alt_text,
        created_by, updated_by, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())`,
    [itemId, relPath, img.mimeType, img.buffer.length, displayOrder, img.altText, userId],
  );
}

/** The sentence for a database refusal the user can fix, or null for a real failure. */
export function writeErrorMessage(error: unknown): string | null {
  if (isDuplicateVariantError(error)) return DUPLICATE_VARIANT;
  if ((error as { code?: string } | null)?.code === "23503") return MISSING_LOOKUP; // foreign key
  return null;
}
