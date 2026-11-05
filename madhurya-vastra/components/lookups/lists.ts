import type { LookupItem } from "@/types";

export type ListKey = "types" | "colors" | "occasions" | "tags";

export type ListConfig = {
  key: ListKey;
  /** Tab label, plural: "Item types". */
  label: string;
  /** One value, lower case: "item type" — used in buttons and messages. */
  singular: string;
  /** API path under /api/lookups. */
  endpoint: string;
  /** Colours carry a hex code and show a swatch. */
  hasColor?: boolean;
};

/** The four lists edited on Manage Lists, in tab order. */
export const LISTS: ListConfig[] = [
  { key: "types", label: "Item types", singular: "item type", endpoint: "item-types" },
  { key: "colors", label: "Colours", singular: "colour", endpoint: "colors", hasColor: true },
  { key: "occasions", label: "Occasions", singular: "occasion", endpoint: "occasions" },
  { key: "tags", label: "Tags", singular: "tag", endpoint: "tags" },
];

export const NAME_MAX = 50;
export const HEX = /^#[0-9A-Fa-f]{6}$/;

export const byName = (a: LookupItem, b: LookupItem) => a.name.localeCompare(b.name);
