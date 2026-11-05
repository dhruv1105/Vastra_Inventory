import { describe, expect, it } from "vitest";
import { buildCaption, detailLines, DETAIL_KEYS, fillTemplate, priceText, unknownFields, type CaptionItem } from "@/lib/caption";

const v = (size: string, colorId: string | null, quantity: number, sellingPriceOverride: number | null = null) => ({
  size, colorId, colorName: colorId && colorId[0].toUpperCase() + colorId.slice(1), quantity, sellingPriceOverride,
});

const saree = (over: Partial<CaptionItem> = {}): CaptionItem => ({
  title: "Lavender Georgette Saree",
  description: "Soft georgette with a zari border.",
  itemTypeName: "Saree",
  isOneOfAKind: false,
  sellingPrice: 2499,
  occasions: [{ name: "Festive" }, { name: "Wedding" }],
  designColors: [{ name: "Lavender" }, { name: "Gold" }],
  variants: [v("XL", "red", 1), v("S", "red", 2), v("M", "blue", 0), v("S", "blue", 3)],
  ...over,
});

describe("unknownFields", () => {
  it("a caption allows only {title}; each other field reported once, as written", () => {
    expect(unknownFields("{title} at {prise} — {prise} {Title}", "caption")).toEqual(["{prise}", "{Title}"]);
    expect(unknownFields("New arrival: {title}", "caption")).toEqual([]);
  });
  it("shop details allow no fields", () => {
    expect(unknownFields("Call {title}", "shop_details")).toEqual(["{title}"]);
    expect(unknownFields("📞 98765 43210", "shop_details")).toEqual([]);
  });
});

describe("fillTemplate", () => {
  it("fills {title} and keeps text exactly as typed (emoji, Hindi/Gujarati, inner spaces)", () => {
    expect(fillTemplate("✨ नया आगमन ✨\n{title}  —  નવું", saree())).toBe("✨ नया आगमन ✨\nLavender Georgette Saree  —  નવું");
  });
  it("generic share: a line whose fields are all empty disappears, other lines stay", () => {
    expect(fillTemplate("New Diwali collection!\nNow in: {title}\nVisit us 🙏", null)).toBe("New Diwali collection!\nVisit us 🙏");
  });
  it("Windows line breaks and leading/trailing blank lines are tidied", () => {
    expect(fillTemplate("\n\r\nHello\r\n\r\n{title}\r\n\n", saree())).toBe("Hello\n\nLavender Georgette Saree");
  });
});

describe("priceText", () => {
  it("one price when every in-stock piece costs the same", () => {
    expect(priceText(saree())).toBe("₹2,499");
  });
  it("'from' the lowest in-stock price when prices differ", () => {
    expect(priceText(saree({ variants: [v("S", "red", 1, 2199), v("M", "red", 1)] }))).toBe("from ₹2,199");
  });
  it("a cheaper size that is out of stock doesn't count", () => {
    expect(priceText(saree({ variants: [v("S", "red", 0, 1999), v("M", "red", 1)] }))).toBe("₹2,499");
  });
  it("no stock or no variants → the item's price; Indian grouping", () => {
    expect(priceText(saree({ variants: [], sellingPrice: 129999 }))).toBe("₹1,29,999");
  });
});

describe("detailLines", () => {
  it("every detail, in the fixed order, whatever order they were ticked in", () => {
    expect(detailLines(saree(), [...DETAIL_KEYS].reverse())).toEqual([
      "Price: ₹2,499",
      "Sizes: S, XL",
      "Colours: Red, Blue",
      "Type: Saree",
      "Occasions: Festive, Wedding",
      "Colours in the design: Lavender, Gold",
      "Soft georgette with a zari border.",
    ]);
  });
  it("nothing ticked → no lines (price is off by default)", () => {
    expect(detailLines(saree(), [])).toEqual([]);
  });
  it("sizes and colours list only what is in stock", () => {
    const item = saree({ variants: [v("M", "blue", 0), v("L", "green", 2), v("S", "red", 0)] });
    expect(detailLines(item, ["sizes", "colours"])).toEqual(["Sizes: L", "Colours: Green"]);
  });
  it("a detail with no value adds no line", () => {
    const item = saree({ variants: [v("M", null, 2)], itemTypeName: null, occasions: [], designColors: [], description: "  " });
    expect(detailLines(item, DETAIL_KEYS)).toEqual(["Price: ₹2,499", "Sizes: M"]);
  });
  it("one-of-a-kind piece shows 'One of a kind' instead of sizes", () => {
    const item = saree({ isOneOfAKind: true, variants: [v("One Size", null, 1)] });
    expect(detailLines(item, ["sizes", "colours"])).toEqual(["One of a kind"]);
  });
});

describe("buildCaption", () => {
  const shop = "Madhurya Vastra — Grace in Every Thread\n📞 98765 43210";

  it("template → details → shop details, separated by one blank line", () => {
    expect(buildCaption({ template: "✨ New arrival ✨\n{title}", item: saree(), details: ["price", "sizes"], shop })).toBe(
      "✨ New arrival ✨\nLavender Georgette Saree\n\nPrice: ₹2,499\nSizes: S, XL\n\n" + shop,
    );
  });
  it("no shop details and nothing ticked → template only", () => {
    expect(buildCaption({ template: "{title} 🙏", item: saree(), details: [], shop: null })).toBe("Lavender Georgette Saree 🙏");
  });
  it("no templates at all → starts from the item title", () => {
    expect(buildCaption({ template: null, item: saree(), details: ["type"], shop: null })).toBe("Lavender Georgette Saree\n\nType: Saree");
  });
  it("generic share (no item): details skipped, {title} line gone, shop details kept", () => {
    expect(buildCaption({ template: "New collection is in!\n{title}", item: null, details: ["price"], shop })).toBe(
      "New collection is in!\n\n" + shop,
    );
  });
  it("blank shop details add nothing", () => {
    expect(buildCaption({ template: "Hi", item: null, details: [], shop: "\n  \n" })).toBe("Hi");
  });
});
