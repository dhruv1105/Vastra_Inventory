import { lookupCollection } from "@/lib/lookups";

// GET: any signed-in user. POST: owner. Shared handlers in lib/lookups.ts.
export const { GET, POST } = lookupCollection({ table: "tags", noun: "tag" });
