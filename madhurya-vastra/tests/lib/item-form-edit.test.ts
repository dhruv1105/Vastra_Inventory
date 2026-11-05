import { describe, expect, it } from "vitest";
import { buildEditPayload, editVariants, formFromItem, inEdit } from "@/components/items/form";
import type { Item } from "@/types";

const V = "2026-11-05 10:12:00.123456+00";
const variant = (size: string, colorId: string | null, quantity: number, extra: object = {}) => ({
  id: `${size}-${colorId}`, size, colorId, colorName: colorId, colorHex: null, colorHex2: null, quantity,
  sellingPriceOverride: null, costPriceOverride: null, displayOrder: 0, ...extra,
});
const item = (extra: Partial<Item> = {}) =>
  ({
    id: "i1", title: "Peach Lehenga", description: null, itemTypeId: "t1", itemTypeName: "Lehenga", wearType: "both",
    status: "active", isOneOfAKind: false, sellingPrice: 4999, costPrice: 3000, captionText: null,
    createdAt: "", createdBy: null, updatedAt: "", updatedBy: null, version: V,
    occasions: [{ id: "o1", name: "Wedding" }], tags: [], designColors: [{ id: "red", name: "Red" }],
    variants: [variant("M", "peach", 2, { sellingPriceOverride: 4499, costPriceOverride: 2900 }), variant("L", "peach", 3), variant("M", "mint", 1)],
    images: [{ id: "p1", cdnUrl: "/a.webp", displayOrder: 0, altText: "Front" }],
    ...extra,
  }) as Item;

describe("formFromItem", () => {
  it("fills the form from the item, quantities and prices per cell, version kept as given", () => {
    const { form, base } = formFromItem(item());
    expect(form).toMatchObject({
      title: "Peach Lehenga", description: "", sellingPrice: "4999", costPrice: "3000", wearType: "both",
      occasionIds: ["o1"], designColorIds: ["red"], sizes: ["M", "L"], colorIds: ["peach", "mint"],
      quantities: { M: { peach: 2, mint: 1 }, L: { peach: 3 } }, priceOverrides: { M: { peach: "4499" } },
    });
    expect(form.images).toEqual([{ id: "p1", existingId: "p1", preview: "/a.webp", mimeType: "", displayOrder: 0, altText: "Front" }]);
    expect(base.version).toBe(V);
    expect(base.existing["m|peach"]).toEqual({ quantity: 2, costPriceOverride: 2900 });
  });

  it("a seller's item (no cost fields) starts with an empty cost", () => {
    const seller = item();
    delete (seller as Partial<Item>).costPrice;
    expect(formFromItem(seller).form.costPrice).toBe("");
  });
});

describe("editVariants", () => {
  it("never creates a size × colour that didn't exist between existing ones (L × mint)", () => {
    const { form, base } = formFromItem(item());
    expect(inEdit(base, "L", "mint")).toBe("absent");
    expect(editVariants(form, base).map((v) => `${v.size}/${v.colorId}`)).toEqual(["M/peach", "M/mint", "L/peach"]);
  });

  it("a new size or colour brings its variants; stored cost overrides are sent back unchanged", () => {
    const { form, base } = formFromItem(item());
    const vs = editVariants({ ...form, sizes: [...form.sizes, "XL"], colorIds: [...form.colorIds, "gold"] }, base);
    expect(vs.map((v) => `${v.size}/${v.colorId}`)).toEqual(["M/peach", "M/mint", "M/gold", "L/peach", "L/gold", "XL/peach", "XL/mint", "XL/gold"]);
    expect(vs[0]).toMatchObject({ sellingPriceOverride: 4499, costPriceOverride: 2900 });
  });

  it("one of a kind: the single piece, its cost override kept", () => {
    const { form, base } = formFromItem(item({ isOneOfAKind: true, variants: [variant("One Size", null, 1, { costPriceOverride: 100 })] as Item["variants"] }));
    expect(form.sizes).toEqual([]);
    expect(editVariants(form, base)).toEqual([{ size: "One Size", colorId: null, sellingPriceOverride: null, costPriceOverride: 100 }]);
  });
});

describe("buildEditPayload", () => {
  it("version, no quantities, photos split into keep and add in screen order", () => {
    const { form, base } = formFromItem(item());
    const added = { id: "n1", file: new File(["x"], "x.png"), preview: "blob:x", base64: "data:image/png;base64,eA==", mimeType: "image/png", displayOrder: 0, altText: null };
    const body = buildEditPayload({ ...form, images: [added, ...form.images] }, base);
    expect(body.version).toBe(V);
    expect(JSON.stringify(body.variants)).not.toMatch(/quantity/);
    expect(body.images).toEqual({
      keep: [{ id: "p1", displayOrder: 1, altText: "Front" }],
      add: [{ base64: "data:image/png;base64,eA==", mimeType: "image/png", displayOrder: 0, altText: null }],
    });
    expect(body).not.toHaveProperty("oneOfAKindColorId");
  });

  it("turning one of a kind off sends the chosen colour", () => {
    const { form, base } = formFromItem(item({ isOneOfAKind: true, variants: [variant("One Size", null, 1)] as Item["variants"] }));
    const body = buildEditPayload({ ...form, isOneOfAKind: false, sizes: ["One Size"], colorIds: ["red"] }, { ...base, pieceColorId: "red" });
    expect(body).toMatchObject({ isOneOfAKind: false, oneOfAKindColorId: "red" });
  });
});
