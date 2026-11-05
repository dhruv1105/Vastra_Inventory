import { describe, expect, it } from "vitest";
import { stockGrid } from "@/lib/stock";

const v = (size: string, colorId: string | null, quantity: number, sellingPriceOverride: number | null = null) => ({
  size, colorId, colorName: colorId && colorId.toUpperCase(), colorHex: null, colorHex2: null, quantity, sellingPriceOverride,
});

describe("stockGrid", () => {
  it("rows in size order, columns in the order added, a hole where a combination doesn't exist", () => {
    const g = stockGrid([v("XL", "red", 1), v("S", "red", 2, 1799), v("S", "blue", 0)]);
    expect(g.sizes).toEqual(["S", "XL"]);
    expect(g.columns.map((c) => c.name)).toEqual(["RED", "BLUE"]);
    expect(g.cell("S", "red")).toEqual({ quantity: 2, price: 1799 });
    expect(g.cell("S", "blue")).toEqual({ quantity: 0, price: null });
    expect(g.cell("XL", "blue")).toBeNull();
    expect(g.total).toBe(3);
  });

  it("variants without a colour share one 'No colour' column", () => {
    const g = stockGrid([v("M", null, 2), v("L", null, 1)]);
    expect(g.columns).toEqual([{ key: "none", name: "No colour", hex: null, hex2: null }]);
    expect(g.cell("L", "none")).toEqual({ quantity: 1, price: null });
  });

  it("no variants → empty grid, total 0", () => {
    expect(stockGrid([])).toMatchObject({ sizes: [], columns: [], total: 0 });
  });
});
