import { describe, expect, it } from "vitest";
import { diffItems } from "@/lib/item-edit";
import type { Item } from "@/types";

const base = {
  id: "i", title: "Saree", description: null, itemTypeName: "Saree", wearType: "both", sellingPrice: 1999, costPrice: 1200,
  isOneOfAKind: false, occasions: [{ id: "o1", name: "Wedding" }], tags: [], designColors: [],
  variants: [{ id: "v1", size: "M", colorId: "c", colorName: "Red", quantity: 2, sellingPriceOverride: null, costPriceOverride: 900, displayOrder: 0 }],
  images: [{ id: "p1", cdnUrl: "/a.jpg", displayOrder: 0, altText: null }],
} as unknown as Item;
const edit = (patch: Partial<Item>) => ({ ...base, ...patch }) as Item;

describe("diffItems (activity before/after)", () => {
  it("nothing changed → empty before/after, no variant or photo section", () => {
    expect(diffItems(base, edit({}))).toEqual({ before: {}, after: {} });
  });

  it("only the changed fields, with names for lists", () => {
    const d = diffItems(base, edit({ sellingPrice: 2099, costPrice: 1300, occasions: [{ id: "o2", name: "Festive" }] as Item["occasions"] }));
    expect(d).toEqual({
      before: { sellingPrice: 1999, costPrice: 1200, occasions: ["Wedding"] },
      after: { sellingPrice: 2099, costPrice: 1300, occasions: ["Festive"] },
    });
  });

  it("variants added, removed and changed by label; photos counted", () => {
    const d = diffItems(
      base,
      edit({
        variants: [
          { ...base.variants[0], sellingPriceOverride: 2199 },
          { id: "v2", size: "L", colorId: null, colorName: null, quantity: 0, sellingPriceOverride: null, displayOrder: 1 },
        ] as Item["variants"],
        images: [{ id: "p2", cdnUrl: "/b.jpg", displayOrder: 0, altText: "Back" }],
      }),
    );
    expect(d.variants).toEqual({
      added: ["L"],
      removed: [],
      changed: [{ variant: "M × Red", before: { sellingPriceOverride: null }, after: { sellingPriceOverride: 2199 } }],
    });
    expect(d.photos).toEqual({ added: 1, removed: 1, edited: 0 });
  });

  it("design colours by name", () => {
    const d = diffItems(base, edit({ designColors: [{ id: "c1", name: "Red" }, { id: "c2", name: "Gold" }] as Item["designColors"] }));
    expect(d).toEqual({ before: { designColors: [] }, after: { designColors: ["Red", "Gold"] } });
  });
});
