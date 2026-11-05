import { describe, expect, it } from "vitest";
import { fileStem, whatsappUrl } from "@/lib/share";
import { notShareableReason } from "@/lib/caption";

describe("fileStem", () => {
  it("title → safe lower-case file name", () => {
    expect(fileStem("Lavender Georgette Saree")).toBe("lavender-georgette-saree");
    expect(fileStem("  Rāni / Pink — Set #2 ")).toBe("rani-pink-set-2");
  });
  it("nothing usable (e.g. only Hindi) → the shop's name", () => {
    expect(fileStem("साड़ी")).toBe("madhurya-vastra");
  });
});

describe("whatsappUrl", () => {
  it("fills the text, encoded (line breaks, ₹, emoji)", () => {
    expect(whatsappUrl("Hi 🙏\nPrice: ₹2,499 & more")).toBe(`https://wa.me/?text=${encodeURIComponent("Hi 🙏\nPrice: ₹2,499 & more")}`);
  });
});

describe("notShareableReason", () => {
  it("only active items can be shared; the rest say why", () => {
    expect(notShareableReason("active")).toBeNull();
    expect(notShareableReason("sold_out")).toBe("Sold out — only items in stock can be shared.");
    expect(notShareableReason("draft")).toMatch(/Publish/);
    expect(notShareableReason("archived")).toMatch(/restore/);
  });
});
