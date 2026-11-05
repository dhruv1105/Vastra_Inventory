import type { Role } from "@/lib/auth/roles";

// Cost prices (and anything derived from them, like margin) are owner-only. Two layers:
// 1. Seller responses are built field by field from an allowlist (e.g. toSellerItem in
//    lib/items.ts, the inventory list's row mapping), so a new column never reaches them by default.
// 2. This file is the safety net on top: forRole() strips every cost-like key at any depth for
//    non-owners. Item reads and activity-log reads (lib/activity.ts) both pass through it.

const COST_WORDS = new Set(["cost", "margin", "profit", "purchase"]);

/**
 * True for keys that carry cost or cost-derived values: any whole word "cost", "margin", "profit"
 * or "purchase" in a camelCase or snake_case key (costPrice, cost_price_override, unitCost,
 * marginPct, profit, purchasePrice) — but not "costume" or "accost".
 */
export const isCostKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((word) => COST_WORDS.has(word));

/** A deep copy with every cost key removed, at any depth (objects and arrays). */
export function stripCost<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripCost) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !isCostKey(k)).map(([k, v]) => [k, stripCost(v)])) as T;
  }
  return value;
}

/** What a role may receive: the owner gets everything; anyone else gets no cost fields. */
export function forRole<T>(value: T, role: Role): T {
  return role === "owner" ? value : stripCost(value);
}
