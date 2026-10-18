import type { ItemStatus } from "@/types";

// Inventory list: shared by GET /api/items and the /inventory screen. Server-only helpers
// (search query, cursor) live in lib/inventory-query.ts.

/** Items per "Show more" page. */
export const PAGE_SIZE = 20;

/** "Low stock" shows when an item's total stock is at or below this. */
export const LOW_STOCK_AT = 2;

/** Longest search text accepted (the title itself is at most 150). */
export const SEARCH_MAX = 100;

/** Statuses the list shows. Archived items are hidden. */
export const LIST_STATUSES = ["active", "draft", "sold_out"] as const satisfies readonly ItemStatus[];

/** One card on /inventory. Never carries a cost price. */
export type InventoryItem = {
  id: string;
  title: string;
  status: ItemStatus;
  itemTypeName: string | null;
  sellingPrice: number;
  /** The lowest live variant price when it is below `sellingPrice` ("from ₹X"), else null. */
  fromPrice: number | null;
  coverUrl: string | null;
  coverAlt: string | null;
  /** Sum of live variant quantities (0 when there are no variants). */
  totalStock: number;
  variantCount: number;
  isOneOfAKind: boolean;
};

export type InventoryPage = { items: InventoryItem[]; nextCursor: string | null };

/** Badge text by status. Active is the normal case and gets no badge. */
export const STATUS_BADGE: Partial<Record<ItemStatus, string>> = { draft: "Draft", sold_out: "Sold out" };

/**
 * Low stock is a prompt to restock live, countable stock — so never for drafts, sold-out items,
 * one-of-a-kind pieces (always 1) or items with no variants (no stock added).
 */
export function isLowStock(item: Pick<InventoryItem, "status" | "isOneOfAKind" | "variantCount" | "totalStock">): boolean {
  return item.status === "active" && !item.isOneOfAKind && item.variantCount > 0 && item.totalStock <= LOW_STOCK_AT;
}
