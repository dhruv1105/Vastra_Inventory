import { normalizeSize, sizeKey } from "@/lib/sizes";

// Server-side variant rules shared by POST /api/items and PATCH /api/items/[id].

export const DUPLICATE_VARIANT = "Each size and colour can appear only once. Remove the repeated size or colour and save again.";

/**
 * Normalises every variant's size in place, then reports "duplicate" if two variants share a size
 * (ignoring case and spacing) and colour. Call after checking that each size is a non-empty string.
 */
export function normalizeVariantSizes(variants: { size?: unknown; colorId?: string | null }[]): "ok" | "duplicate" {
  const seen = new Set<string>();
  for (const v of variants) {
    v.size = normalizeSize(String(v.size ?? ""));
    const key = `${sizeKey(v.size as string)}|${v.colorId ?? ""}`;
    if (seen.has(key)) return "duplicate";
    seen.add(key);
  }
  return "ok";
}

/** Postgres unique violation on variants_live_unique (two saves racing): same answer as the check. */
export function isDuplicateVariantError(error: unknown): boolean {
  const e = error as { code?: string; constraint?: string } | null;
  return e?.code === "23505" && e.constraint === "variants_live_unique";
}
