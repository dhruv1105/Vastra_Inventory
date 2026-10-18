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

/** Sizes to show as quick choices (One Size is the one-of-a-kind piece's size, not a choice). */
export const SIZE_CHOICES = KNOWN_SIZES.filter((s) => s !== "One Size");

/** Known sizes in their usual order (XS → XXXL, Free Size), then custom sizes in the order added. */
export function orderSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = (KNOWN_SIZES as readonly string[]).indexOf(s);
    return i === -1 ? KNOWN_SIZES.length : i;
  };
  return sizes.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s);
}
