import { lookupCollection } from "@/lib/lookups";

// GET: any signed-in user. POST: owner or seller (from Add Item). Shared handlers in lib/lookups.ts.
export const { GET, POST } = lookupCollection({ table: "item_types", noun: "type", createRole: "seller" });
