import { describe, expect, it } from "vitest";
import { LOW_STOCK_AT, isLowStock } from "@/lib/inventory";
import { decodeCursor, encodeCursor, toPrefixQuery } from "@/lib/inventory-query";

describe("isLowStock", () => {
  const base = { status: "active" as const, isOneOfAKind: false, variantCount: 3, totalStock: LOW_STOCK_AT };

  it("at or below the threshold → low", () => {
    expect(isLowStock(base)).toBe(true);
    expect(isLowStock({ ...base, totalStock: 0 })).toBe(true);
    expect(isLowStock({ ...base, totalStock: LOW_STOCK_AT + 1 })).toBe(false);
  });

  it("never for drafts, sold-out, one-of-a-kind or items with no variants", () => {
    expect(isLowStock({ ...base, status: "draft" })).toBe(false);
    expect(isLowStock({ ...base, status: "sold_out" })).toBe(false);
    expect(isLowStock({ ...base, isOneOfAKind: true, totalStock: 1 })).toBe(false);
    expect(isLowStock({ ...base, variantCount: 0, totalStock: 0 })).toBe(false);
  });
});

describe("toPrefixQuery", () => {
  it("turns words into prefix terms joined with AND", () => {
    expect(toPrefixQuery("Lavender  Geo")).toBe("lavender:* & geo:*");
  });
  it("drops tsquery operators and punctuation", () => {
    expect(toPrefixQuery("lav)(:*&|!'")).toBe("lav:*");
    expect(toPrefixQuery("off-white")).toBe("off:* & white:*");
  });
  it("keeps Indic letters with their vowel signs", () => {
    expect(toPrefixQuery("साड़ी")).toBe(`${"साड़ी".normalize("NFKC")}:*`);
  });
  it("null when nothing searchable is left", () => {
    expect(toPrefixQuery("  &!  ")).toBeNull();
    expect(toPrefixQuery("")).toBeNull();
  });
});

describe("cursor", () => {
  const c = { createdAt: "2026-10-18 11:42:00.123456+05:30", id: "22222222-2222-2222-2222-222222222222" };
  it("round-trips with microseconds and offset intact", () => {
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  it("rejects anything it did not produce", () => {
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("a".repeat(201))).toBeNull();
    expect(decodeCursor(Buffer.from(`2026-10-18|${c.id}`).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(`${c.createdAt}|not-a-uuid`).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(`${c.createdAt}'; DROP TABLE items;--|${c.id}`).toString("base64url"))).toBeNull();
  });
});
