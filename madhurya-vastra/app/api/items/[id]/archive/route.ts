import { NextResponse } from "next/server";
import { requireUser, UUID } from "@/lib/auth/guard";
import { OUT_OF_DATE, changeItemStatus, readVersion } from "@/lib/item-status";

// POST { version } — Out of the inventory list (draft, active or sold out → archived); the link still works. Owner only.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request, { role: "owner" });
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  const version = await readVersion(request);
  if (!version) return NextResponse.json({ error: OUT_OF_DATE }, { status: 400 });
  return changeItemStatus("archive", params.id, version, g.user);
}
