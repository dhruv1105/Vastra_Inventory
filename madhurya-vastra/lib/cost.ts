import type { Role } from "@/lib/auth/roles";

// Cost prices (and anything derived from them, like margin) are owner-only. This is the ONE place
// that decides it: item reads (lib/items.ts) and activity-log reads (lib/activity.ts) both pass
// their data through `forRole`, so a new cost field is hidden from sellers without extra code.

const COST_WORDS = new Set(["cost", "margin"]);

/**
 * True for keys that carry cost or cost-derived values: any whole word "cost" or "margin" in a
 * camelCase or snake_case key (costPrice, cost_price_override, unitCost, marginPct) — but not
 * "costume" or "accost".
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
