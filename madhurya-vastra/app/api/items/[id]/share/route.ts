import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requireUser, UUID } from "@/lib/auth/guard";
import { MAX_SHARE_PHOTOS, notShareableReason } from "@/lib/caption";

// POST { templateId: uuid | null, photos: 0…8 } — records that staff shared this item (item.shared).
// Only active items (in stock and live) can be shared — owner's answer, docs/plans/sharing.md.
// The log keeps the template's name and the photo count, never the caption text.


const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return fail("Item not found", 404);
  const body = (await request.json().catch(() => null)) as { templateId?: unknown; photos?: unknown } | null;
  if (!body || typeof body !== "object") return fail("Invalid JSON body");
  const { templateId = null, photos } = body;
  if (templateId !== null && !(typeof templateId === "string" && UUID.test(templateId))) return fail("Invalid template");
  if (typeof photos !== "number" || !Number.isInteger(photos) || photos < 0 || photos > MAX_SHARE_PHOTOS) {
    return fail(`Photos must be a whole number from 0 to ${MAX_SHARE_PHOTOS}`);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT i.status,
              (SELECT t.name FROM caption_templates t WHERE t.id = $2::uuid AND t.kind = 'caption' AND t.deleted_at IS NULL) AS template
       FROM items i WHERE i.id = $1 AND i.deleted_at IS NULL`,
      [params.id, templateId],
    );
    const item = rows[0] as { status: string; template: string | null } | undefined;
    if (!item) {
      await client.query("ROLLBACK");
      return fail("Item not found", 404);
    }
    if (item.status !== "active") {
      await client.query("ROLLBACK");
      return fail(notShareableReason(item.status) ?? "This item can't be shared.", 409);
    }
    await logActivity(client, {
      actorId: g.user.id, action: "item.shared", entityType: "item", entityId: params.id,
      payload: { template: item.template, photos },
    });
    await client.query("COMMIT");
    return NextResponse.json({ data: { logged: true } });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return fail("Internal server error", 500);
  } finally {
    client.release();
  }
}
