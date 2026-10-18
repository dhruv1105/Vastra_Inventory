import type { ItemFormData, VariantInput, WearType } from "@/types";

export const TITLE_MAX = 150;
export const DESC_MAX = 500;

export const WEAR_OPTIONS: { value: WearType; label: string }[] = [
  { value: "top", label: "Top wear" },
  { value: "bottom", label: "Bottom wear" },
  { value: "both", label: "Top + Bottom" },
];

export const INITIAL_FORM: ItemFormData = {
  images: [],
  title: "",
  description: "",
  itemTypeId: null,
  wearType: null,
  occasionIds: [],
  tagIds: [],
  costPrice: "",
  sellingPrice: "",
  sizes: [],
  colorIds: [],
  quantities: {},
  priceOverrides: {},
  isOneOfAKind: false,
  status: "active",
};

/** The five sections, in page order. */
export const SECTIONS = [
  { key: "photos", label: "Photos" },
  { key: "details", label: "Details" },
  { key: "classify", label: "Classify" },
  { key: "price", label: "Price" },
  { key: "variants", label: "Sizes & colours" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

export type FieldKey = "title" | "wearType" | "sellingPrice" | "variants";
export type Errors = Partial<Record<FieldKey, string>>;

/** Which section and which element each error belongs to (for the summary links). */
export const ERROR_TARGET: Record<FieldKey, { section: SectionKey; label: string; elementId: string }> = {
  title: { section: "details", label: "Title", elementId: "item-title" },
  wearType: { section: "details", label: "Wear type", elementId: "item-wear" },
  sellingPrice: { section: "price", label: "Selling price", elementId: "item-sell" },
  variants: { section: "variants", label: "Sizes & colours", elementId: "item-variants" },
};

/** Clearing a field clears its error. */
export const ERROR_FOR: Partial<Record<keyof ItemFormData, FieldKey>> = {
  title: "title",
  wearType: "wearType",
  sellingPrice: "sellingPrice",
  sizes: "variants",
  colorIds: "variants",
  isOneOfAKind: "variants",
};

const num = (s: string) => parseFloat(s);

export function validate(form: ItemFormData): Errors {
  const e: Errors = {};
  if (!form.title.trim()) e.title = "Add a title so staff can find this item.";
  if (!form.wearType) e.wearType = "Choose top, bottom or both.";
  if (!(num(form.sellingPrice) > 0)) e.sellingPrice = "Enter a selling price above ₹0.";
  if (!form.isOneOfAKind && (form.sizes.length > 0) !== (form.colorIds.length > 0)) {
    e.variants = "Add at least one size and one colour, or clear both, or mark the item one of a kind.";
  }
  return e;
}

/** A section is "done" when what it needs is filled in (drives the ticks in the jump bar). */
export function sectionDone(form: ItemFormData): Record<SectionKey, boolean> {
  return {
    photos: form.images.length > 0,
    details: !!form.title.trim() && !!form.wearType,
    classify: form.occasionIds.length + form.tagIds.length > 0,
    price: num(form.sellingPrice) > 0,
    variants: form.isOneOfAKind || (form.sizes.length > 0 && form.colorIds.length > 0),
  };
}

export function margin(form: ItemFormData): { diff: number; pct: number } | null {
  const cost = num(form.costPrice);
  const sell = num(form.sellingPrice);
  if (!(sell > 0) || !(cost > 0)) return null;
  const diff = sell - cost;
  return { diff, pct: (diff / sell) * 100 };
}

export function buildVariants(form: ItemFormData): VariantInput[] {
  if (form.isOneOfAKind) {
    return [{ size: "One Size", colorId: null, quantity: 1, sellingPriceOverride: null, costPriceOverride: null }];
  }
  const out: VariantInput[] = [];
  for (const size of form.sizes) {
    for (const colorId of form.colorIds) {
      const raw = form.priceOverrides[size]?.[colorId];
      const override = raw !== undefined && raw !== "" ? num(raw) : NaN;
      out.push({
        size,
        colorId,
        quantity: form.quantities[size]?.[colorId] ?? 0,
        sellingPriceOverride: Number.isFinite(override) && override > 0 ? override : null,
        costPriceOverride: null,
      });
    }
  }
  return out;
}

/** Body for POST /api/items — unchanged from before the redesign. */
export function buildPayload(form: ItemFormData, status: "active" | "draft", userId: string) {
  const cost = num(form.costPrice);
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    itemTypeId: form.itemTypeId,
    wearType: form.wearType,
    costPrice: cost > 0 ? cost : null,
    sellingPrice: num(form.sellingPrice),
    occasionIds: form.occasionIds,
    tagIds: form.tagIds,
    variants: buildVariants(form),
    images: form.images.map((i, idx) => ({ base64: i.base64, mimeType: i.mimeType, displayOrder: idx, altText: i.altText })),
    status,
    userId,
  };
}
