import { formatINR } from "@/lib/format";
import { orderSizes } from "@/lib/sizes";
import type { ItemSellerView } from "@/types";

// Captions for sharing an item (or a generic message) to WhatsApp / Instagram.
// Pure: used by the share sheet, the template editor's preview and the template routes' checks.
// A caption is: template text → ticked item details → shop details, separated by blank lines.
// Plan: docs/plans/sharing.md.

export type TemplateKind = "caption" | "shop_details";

export const TEMPLATE_NAME_MAX = 50;
export const TEMPLATE_BODY_MAX = 1000;
/** WhatsApp cuts a photo's caption after this many characters. */
export const WHATSAPP_CAPTION_MAX = 1024;

/** The only field a caption template may contain; shop details contain none. */
export const TITLE_FIELD = "title";
const FIELDS_BY_KIND: Record<TemplateKind, readonly string[]> = { caption: [TITLE_FIELD], shop_details: [] };

/** Item details staff can tick in the share sheet, in the order they appear in the caption. */
export const DETAIL_FIELDS = [
  { key: "price", label: "Price" },
  { key: "sizes", label: "Sizes" },
  { key: "colours", label: "Colours" },
  { key: "type", label: "Type" },
  { key: "occasions", label: "Occasions" },
  { key: "design_colours", label: "Colours in the design" },
  { key: "description", label: "Description" },
] as const;

export type DetailKey = (typeof DETAIL_FIELDS)[number]["key"];
export const DETAIL_KEYS: readonly DetailKey[] = DETAIL_FIELDS.map((f) => f.key);
export const isDetailKey = (k: unknown): k is DetailKey => typeof k === "string" && (DETAIL_KEYS as readonly string[]).includes(k);

/** What the caption needs from an item (a seller's view has everything; never cost). */
export type CaptionItem = Pick<ItemSellerView, "title" | "description" | "itemTypeName" | "isOneOfAKind" | "sellingPrice"> & {
  occasions: { name: string }[];
  designColors: { name: string }[];
  variants: Pick<ItemSellerView["variants"][number], "size" | "colorId" | "colorName" | "quantity" | "sellingPriceOverride">[];
};

const FIELD = /\{([^{}\n]*)\}/g;

/** Fields written in the text that this kind of template doesn't allow, each once, as written. */
export function unknownFields(body: string, kind: TemplateKind): string[] {
  const allowed = FIELDS_BY_KIND[kind];
  const bad = new Set<string>();
  for (const m of Array.from(body.matchAll(FIELD))) if (!allowed.includes(m[1])) bad.add(`{${m[1]}}`);
  return Array.from(bad);
}

const normalise = (text: string) => text.replace(/\r\n?/g, "\n");
/** Leading and trailing blank lines dropped; everything else exactly as typed. */
const trimBlankLines = (text: string) => text.replace(/^(?:[ \t]*\n)+/, "").replace(/(?:\n[ \t]*)+$/, "");

/**
 * Fills `{title}` in a caption template. A line whose fields are all empty disappears (a generic
 * share has no item, so "New: {title}" goes); lines without fields stay as typed.
 */
export function fillTemplate(body: string, item: Pick<CaptionItem, "title"> | null): string {
  const values: Record<string, string> = { [TITLE_FIELD]: item?.title.trim() ?? "" };
  const lines = normalise(body).split("\n").flatMap((line) => {
    const fields = Array.from(line.matchAll(FIELD), (m) => m[1]);
    if (fields.length > 0 && fields.every((f) => !values[f])) return [];
    return [line.replace(FIELD, (_, f: string) => values[f] ?? "")];
  });
  return trimBlankLines(lines.join("\n"));
}

const inStock = (item: CaptionItem) => item.variants.filter((v) => v.quantity > 0);
const join = (names: (string | null | undefined)[]) =>
  Array.from(new Set(names.map((n) => n?.trim()).filter((n): n is string => !!n))).join(", ");

/** "₹2,499", or "from ₹2,199" when an in-stock size or colour costs less or more. */
export function priceText(item: CaptionItem): string {
  const prices = inStock(item).map((v) => v.sellingPriceOverride ?? item.sellingPrice);
  if (prices.length === 0) return formatINR(item.sellingPrice);
  const low = Math.min(...prices);
  return prices.some((p) => p !== low) ? `from ${formatINR(low)}` : formatINR(low);
}

/** One line per ticked detail that has a value, in DETAIL_FIELDS order. */
export function detailLines(item: CaptionItem, ticked: readonly DetailKey[]): string[] {
  const stock = inStock(item);
  const line: Record<DetailKey, () => string | null> = {
    price: () => `Price: ${priceText(item)}`,
    sizes: () => {
      if (item.isOneOfAKind) return "One of a kind";
      const sizes = join(orderSizes(Array.from(new Set(stock.map((v) => v.size)))));
      return sizes ? `Sizes: ${sizes}` : null;
    },
    colours: () => {
      const colours = join(stock.map((v) => (v.colorId ? v.colorName : null)));
      return colours ? `Colours: ${colours}` : null;
    },
    type: () => (item.itemTypeName?.trim() ? `Type: ${item.itemTypeName.trim()}` : null),
    occasions: () => {
      const names = join(item.occasions.map((o) => o.name));
      return names ? `Occasions: ${names}` : null;
    },
    design_colours: () => {
      const names = join(item.designColors.map((c) => c.name));
      return names ? `Colours in the design: ${names}` : null;
    },
    description: () => (item.description?.trim() ? trimBlankLines(normalise(item.description)) : null),
  };
  return DETAIL_KEYS.filter((k) => ticked.includes(k)).flatMap((k) => line[k]() ?? []);
}

export type CaptionInput = {
  /** Caption template text; null when there are no templates (the item title is used). */
  template: string | null;
  /** null for a generic share (no item): details are skipped. */
  item: CaptionItem | null;
  details: readonly DetailKey[];
  /** Shop-details text, or null for none. */
  shop: string | null;
};

/** template text → ticked details → shop details, separated by one blank line; empty parts skipped. */
export function buildCaption({ template, item, details, shop }: CaptionInput): string {
  const head = template === null ? (item?.title.trim() ?? "") : fillTemplate(template, item);
  const parts = [head, item ? detailLines(item, details).join("\n") : "", shop === null ? "" : trimBlankLines(normalise(shop))];
  return parts.filter((p) => p.trim() !== "").join("\n\n");
}
