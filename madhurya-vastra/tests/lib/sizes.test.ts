import { describe, expect, it } from "vitest";
import { normalizeSize, sizeKey } from "@/lib/sizes";
import { DUPLICATE_VARIANT, isDuplicateVariantError, normalizeVariantSizes } from "@/lib/variants";

describe("normalizeSize", () => {
  it.each([
    ["xl", "XL"], [" m ", "M"], ["FREE   size", "Free Size"], ["one size", "One Size"], ["xxxl", "XXXL"],
    ["  Kids 6-7 yrs ", "Kids 6-7 yrs"], ["32", "32"],
  ])("%j → %j", (raw, want) => expect(normalizeSize(raw)).toBe(want));
  it("sizeKey ignores case and spacing", () => expect(sizeKey(" Free  SIZE ")).toBe(sizeKey("free size")));
});

describe("normalizeVariantSizes", () => {
  it("normalises in place", () => {
    const v = [{ size: "xl", colorId: "c1" }, { size: " m", colorId: "c1" }];
    expect(normalizeVariantSizes(v)).toBe("ok");
    expect(v.map((x) => x.size)).toEqual(["XL", "M"]);
  });
  it("same size (any case/spacing) + same colour → duplicate; different colour is fine", () => {
    expect(normalizeVariantSizes([{ size: "M", colorId: "c1" }, { size: " m ", colorId: "c1" }])).toBe("duplicate");
    expect(normalizeVariantSizes([{ size: "One Size", colorId: null }, { size: "one size", colorId: null }])).toBe("duplicate");
    expect(normalizeVariantSizes([{ size: "M", colorId: "c1" }, { size: "M", colorId: "c2" }])).toBe("ok");
  });
  it("a unique-index race maps to the same clear message", () => {
    expect(isDuplicateVariantError({ code: "23505", constraint: "variants_live_unique" })).toBe(true);
    expect(isDuplicateVariantError({ code: "23505", constraint: "colors_name_unique" })).toBe(false);
    expect(DUPLICATE_VARIANT).toMatch(/only once/);
  });
});
