import { NextResponse } from "next/server";
import { requireUser, UUID } from "@/lib/auth/guard";
import { OUT_OF_DATE, changeItemStatus, readVersion } from "@/lib/item-status";

// POST { version } — Draft → active. Owner and sellers.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  const version = await readVersion(request);
  if (!version) return NextResponse.json({ error: OUT_OF_DATE }, { status: 400 });
  return changeItemStatus("publish", params.id, version, g.user);
}
