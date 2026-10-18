// Size labels: one spelling per size, so "m", " M " and "M" are the same variant.
// Used on save by POST/PATCH /api/items and by the size picker. The database enforces the same rule
// with variants_live_unique (migration 0005), which indexes lower(collapsed, trimmed size).

/** Sizes with a usual spelling; matched ignoring case and spacing. */
export const KNOWN_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size", "One Size"] as const;

const collapse = (raw: string) => raw.trim().replace(/\s+/g, " ");

/** Comparison key: what the unique index compares (case and spacing ignored). */
export const sizeKey = (raw: string) => collapse(raw).toLowerCase();

const KNOWN = new Map<string, string>(KNOWN_SIZES.map((s) => [sizeKey(s), s]));

/** Trimmed, inner spaces collapsed; known sizes in their usual case ("xl" → "XL"); custom sizes as typed. */
export function normalizeSize(raw: string): string {
  const s = collapse(raw);
  return KNOWN.get(s.toLowerCase()) ?? s;
}
