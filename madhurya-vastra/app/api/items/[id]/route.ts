import { NextResponse } from "next/server";
import { requireUser, UUID as UUID_REGEX } from "@/lib/auth/guard";
import { loadItem } from "@/lib/items";

// One item with everything the detail screen needs. Cost fields go to the owner only (lib/cost.ts).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID_REGEX.test(params.id)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  try {
    const item = await loadItem(params.id, g.user.role);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("GET /api/items/[id] failed:", error);
    return NextResponse.json({ error: "Could not load this item. Try again." }, { status: 500 });
  }
}
