import type { CaptionItem } from "@/lib/caption";

/** The item the template editor previews with (not a real item). */
export const SAMPLE_ITEM: CaptionItem = {
  title: "Lavender Georgette Saree",
  description: "Soft georgette with a zari border and matching blouse piece.",
  itemTypeName: "Saree",
  isOneOfAKind: false,
  sellingPrice: 2499,
  occasions: [{ name: "Festive" }, { name: "Wedding" }],
  designColors: [{ name: "Lavender" }, { name: "Gold" }],
  variants: [
    { size: "M", colorId: "s1", colorName: "Lavender", quantity: 2, sellingPriceOverride: null },
    { size: "L", colorId: "s1", colorName: "Lavender", quantity: 1, sellingPriceOverride: null },
    { size: "M", colorId: "s2", colorName: "Peach", quantity: 1, sellingPriceOverride: 2199 },
  ],
};
