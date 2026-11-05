import type { Item, ItemFormData, ItemSellerView, VariantInput, WearType } from "@/types";
import { ONE_SIZE } from "@/lib/inventory";
import { margin as marginOf } from "@/lib/format";
import { orderSizes, sizeKey } from "@/lib/sizes";

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
  designColorIds: [],
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
    classify: form.occasionIds.length + form.tagIds.length + form.designColorIds.length > 0,
    price: num(form.sellingPrice) > 0,
    variants: form.isOneOfAKind || (form.sizes.length > 0 && form.colorIds.length > 0),
  };
}

/** The price section's margin; the maths is lib/format.ts margin() (exact, in paise). */
export function margin(form: ItemFormData): { diff: number; pct: number } | null {
  const cost = num(form.costPrice);
  const m = cost > 0 ? marginOf(num(form.sellingPrice), cost) : null;
  return m && { diff: m.rupees, pct: m.percent };
}

export function buildVariants(form: ItemFormData): VariantInput[] {
  if (form.isOneOfAKind) {
    return [{ size: ONE_SIZE, colorId: null, quantity: 1, sellingPriceOverride: null, costPriceOverride: null }];
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

/** Body for POST /api/items. Who is adding it comes from the session on the server. */
export function buildPayload(form: ItemFormData, status: "active" | "draft") {
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
    designColorIds: form.designColorIds,
    variants: buildVariants(form),
    images: form.images.map((i, idx) => ({ base64: i.base64, mimeType: i.mimeType, displayOrder: idx, altText: i.altText })),
    status,
    isOneOfAKind: form.isOneOfAKind,
  };
}

// ---- Edit (/items/[id]/edit) ----

/** A variant with no colour (older data) shows as this colour id in the edit grid. */
export const NO_COLOUR = "";

/** Matches a form cell to a stored variant: size compared the way the database does. */
export const variantKey = (size: string, colorId: string | null) => `${sizeKey(size)}|${colorId ?? NO_COLOUR}`;

export type ExistingVariant = { quantity: number; costPriceOverride: number | null };

/** What the edit form started from; travels with the form (and a kept draft) until it is saved. */
export type EditBase = {
  /** The item's version when the form loaded: opaque, sent back unchanged (409 if stale). */
  version: string;
  /** Live variants by variantKey: their stock (read-only here) and stored cost override. */
  existing: Record<string, ExistingVariant>;
  wasOneOfAKind: boolean;
  /** The colour given to the single piece when one of a kind is turned off. */
  pieceColorId: string | null;
};

/** The edit form's starting values from GET /api/items/[id]. */
export function formFromItem(item: Item | ItemSellerView): { form: ItemFormData; base: EditBase } {
  const cost = "costPrice" in item ? item.costPrice : null;
  const existing: EditBase["existing"] = {};
  const quantities: ItemFormData["quantities"] = {};
  const priceOverrides: ItemFormData["priceOverrides"] = {};
  for (const v of item.variants) {
    const c = v.colorId ?? NO_COLOUR;
    existing[variantKey(v.size, v.colorId)] = { quantity: v.quantity, costPriceOverride: "costPriceOverride" in v ? v.costPriceOverride ?? null : null };
    quantities[v.size] = { ...quantities[v.size], [c]: v.quantity };
    if (v.sellingPriceOverride != null) priceOverrides[v.size] = { ...priceOverrides[v.size], [c]: String(v.sellingPriceOverride) };
  }
  const grid = !item.isOneOfAKind;
  return {
    form: {
      images: item.images.map((img, i) => ({ id: img.id, existingId: img.id, preview: img.cdnUrl, mimeType: "", displayOrder: i, altText: img.altText })),
      title: item.title,
      description: item.description ?? "",
      itemTypeId: item.itemTypeId,
      wearType: item.wearType,
      occasionIds: item.occasions.map((o) => o.id),
      tagIds: item.tags.map((t) => t.id),
      designColorIds: item.designColors.map((c) => c.id),
      costPrice: cost != null ? String(cost) : "",
      sellingPrice: String(item.sellingPrice),
      sizes: grid ? orderSizes(Array.from(new Set(item.variants.map((v) => v.size)))) : [],
      colorIds: grid ? Array.from(new Set(item.variants.map((v) => v.colorId ?? NO_COLOUR))) : [],
      quantities: grid ? quantities : {},
      priceOverrides: grid ? priceOverrides : {},
      isOneOfAKind: item.isOneOfAKind,
      status: item.status,
    },
    base: { version: item.version, existing, wasOneOfAKind: item.isOneOfAKind, pieceColorId: null },
  };
}

/** Is this grid cell a variant the edit will keep or create? */
export function inEdit(base: EditBase, size: string, colorId: string): "existing" | "new" | "absent" {
  if (base.existing[variantKey(size, colorId)]) return "existing";
  const keys = Object.keys(base.existing);
  const sizeIsNew = !keys.some((k) => k.startsWith(`${sizeKey(size)}|`));
  const colourIsNew = !keys.some((k) => k.endsWith(`|${colorId}`));
  // A size × colour that never existed between two existing ones stays absent: new variants
  // come only with a newly added size or colour, never silently.
  return sizeIsNew || colourIsNew ? "new" : "absent";
}

/** The full variant list for PATCH: kept ones, plus ones a new size or colour brings (at 0 stock). */
export function editVariants(form: ItemFormData, base: EditBase) {
  if (form.isOneOfAKind) {
    const piece = base.existing[variantKey(ONE_SIZE, null)];
    return [{ size: ONE_SIZE, colorId: null, sellingPriceOverride: null, costPriceOverride: piece?.costPriceOverride ?? null }];
  }
  const out: { size: string; colorId: string | null; sellingPriceOverride: number | null; costPriceOverride: number | null }[] = [];
  for (const size of form.sizes) {
    for (const colorId of form.colorIds) {
      if (inEdit(base, size, colorId) === "absent") continue;
      const raw = form.priceOverrides[size]?.[colorId];
      const override = raw !== undefined && raw !== "" ? num(raw) : NaN;
      out.push({
        size,
        colorId: colorId === NO_COLOUR ? null : colorId,
        sellingPriceOverride: Number.isFinite(override) && override > 0 ? override : null,
        // The owner's stored cost override is sent back unchanged (the form doesn't edit it).
        costPriceOverride: base.existing[variantKey(size, colorId)]?.costPriceOverride ?? null,
      });
    }
  }
  return out;
}

/** Body for PATCH /api/items/[id]. Quantities are never sent: stock moves only through its own actions. */
export function buildEditPayload(form: ItemFormData, base: EditBase) {
  const cost = num(form.costPrice);
  return {
    version: base.version,
    title: form.title.trim(),
    description: form.description.trim() || null,
    itemTypeId: form.itemTypeId,
    wearType: form.wearType,
    costPrice: cost > 0 ? cost : null,
    sellingPrice: num(form.sellingPrice),
    occasionIds: form.occasionIds,
    tagIds: form.tagIds,
    designColorIds: form.designColorIds,
    isOneOfAKind: form.isOneOfAKind,
    ...(base.wasOneOfAKind && !form.isOneOfAKind ? { oneOfAKindColorId: base.pieceColorId } : {}),
    variants: editVariants(form, base),
    images: {
      keep: form.images.flatMap((img, i) => (img.existingId ? [{ id: img.existingId, displayOrder: i, altText: img.altText }] : [])),
      add: form.images.flatMap((img, i) => (img.existingId ? [] : [{ base64: img.base64, mimeType: img.mimeType, displayOrder: i, altText: img.altText }])),
    },
  };
}
