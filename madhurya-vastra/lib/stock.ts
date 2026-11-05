import { orderSizes } from "@/lib/sizes";
import type { VariantDetail } from "@/types";

// The read-only size × colour stock grid on the item detail page.

type V = Pick<VariantDetail, "size" | "colorId" | "colorName" | "colorHex" | "colorHex2" | "quantity" | "sellingPriceOverride">;

export type StockColumn = { key: string; name: string; hex: string | null; hex2: string | null };
export type StockCell = { quantity: number; price: number | null } | null;

export type StockGrid = {
  /** Sizes in the usual order (XS → XXXL, Free Size, then custom). */
  sizes: string[];
  /** Colours in the order they were added; variants with no colour share one "No colour" column. */
  columns: StockColumn[];
  /** null where that size × colour doesn't exist. */
  cell: (size: string, column: string) => StockCell;
  total: number;
};

const NO_COLOUR = "none";

export function stockGrid(variants: V[]): StockGrid {
  const columns: StockColumn[] = [];
  const cells = new Map<string, StockCell>();
  for (const v of variants) {
    const key = v.colorId ?? NO_COLOUR;
    if (!columns.some((c) => c.key === key)) {
      columns.push({ key, name: v.colorId ? v.colorName ?? "—" : "No colour", hex: v.colorHex, hex2: v.colorHex2 });
    }
    cells.set(`${v.size}|${key}`, { quantity: v.quantity, price: v.sellingPriceOverride });
  }
  return {
    sizes: orderSizes(Array.from(new Set(variants.map((v) => v.size)))),
    columns,
    cell: (size, column) => cells.get(`${size}|${column}`) ?? null,
    total: variants.reduce((sum, v) => sum + v.quantity, 0),
  };
}
