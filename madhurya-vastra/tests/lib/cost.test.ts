import { describe, expect, it } from "vitest";
import { forRole, isCostKey, stripCost } from "@/lib/cost";

describe("cost filter (lib/cost.ts)", () => {
  it("recognises cost and margin keys in camelCase and snake_case", () => {
    for (const k of ["costPrice", "cost_price", "costPriceOverride", "cost_price_override", "margin", "marginPct", "unitCost"]) expect(isCostKey(k)).toBe(true);
    for (const k of ["sellingPrice", "selling_price_override", "costume", "accost", "title"]) expect(isCostKey(k)).toBe(false);
  });

  it("removes cost keys at any depth, in objects and arrays, without touching the input", () => {
    const input = { title: "x", costPrice: 1200, variants: [{ size: "M", costPriceOverride: 900, sellingPriceOverride: 1799 }], payload: { before: { cost_price: 1 }, after: { cost_price: 2, selling_price: 3 } } };
    const out = stripCost(input);
    expect(out).toEqual({ title: "x", variants: [{ size: "M", sellingPriceOverride: 1799 }], payload: { before: {}, after: { selling_price: 3 } } });
    expect(input.costPrice).toBe(1200);
  });

  it("forRole: the owner gets everything, a seller gets no cost", () => {
    const v = { sellingPrice: 1, costPrice: 2 };
    expect(forRole(v, "owner")).toEqual(v);
    expect(forRole(v, "seller")).toEqual({ sellingPrice: 1 });
  });
});
