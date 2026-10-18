import { NextResponse } from "next/server";
import { requireUser, UUID as UUID_REGEX } from "@/lib/auth/guard";
import { readActivity } from "@/lib/activity";

// The item's recent history (newest first, 20). Read through lib/activity.ts, so sellers never see
// cost changes. Owner and sellers.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID_REGEX.test(params.id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  try {
    const entries = await readActivity({ entityType: "item", entityId: params.id, limit: 20 }, g.user.role);
    return NextResponse.json({ data: entries });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("GET /api/items/[id]/activity failed:", error);
    return NextResponse.json({ error: "Could not load this item's history. Try again." }, { status: 500 });
  }
}
