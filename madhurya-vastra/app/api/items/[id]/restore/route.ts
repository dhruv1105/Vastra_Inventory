import { NextResponse } from "next/server";
import { requireUser, UUID } from "@/lib/auth/guard";
import { OUT_OF_DATE, changeItemStatus, readVersion } from "@/lib/item-status";

// POST { version } — Archived → sold out if no live stock, otherwise active. Owner only.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request, { role: "owner" });
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  const version = await readVersion(request);
  if (!version) return NextResponse.json({ error: OUT_OF_DATE }, { status: 400 });
  return changeItemStatus("restore", params.id, version, g.user);
}
