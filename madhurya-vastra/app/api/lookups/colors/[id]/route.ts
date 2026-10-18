import { lookupItem } from "@/lib/lookups";

// PATCH (rename) and DELETE (soft delete): owner only. Shared handlers in lib/lookups.ts.
export const { PATCH, DELETE } = lookupItem({ table: "colors", noun: "color", hasColor: true });
