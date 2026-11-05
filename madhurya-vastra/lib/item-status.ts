import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { PG_TIMESTAMPTZ } from "@/lib/inventory-query";
import type { GuardUser } from "@/lib/auth/guard";
import type { ItemStatus } from "@/types";

// Publish / archive / restore / delete one item: one transaction each, with the concurrency check.
// The version is Postgres text for updated_at; it is compared in SQL (`updated_at = $2::timestamptz`),
// never through a JS Date, so changes microseconds apart are still told apart.

export const STALE = "Someone else changed this item — reload to see their changes.";
export const OUT_OF_DATE = "This page is out of date. Reload and try again.";

export type StatusAction = "publish" | "archive" | "restore" | "delete";

const LOG_ACTION: Record<StatusAction, string> = {
  publish: "item.published",
  archive: "item.archived",
  restore: "item.restored",
  delete: "item.deleted",
};

/** The version the screen loaded, or null if it isn't one. */
export async function readVersion(request: Request): Promise<string | null> {
  const body = await request.json().catch(() => null);
  const v = body && typeof body === "object" ? (body as { version?: unknown }).version : undefined;
  return typeof v === "string" && PG_TIMESTAMPTZ.test(v) ? v : null;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Decides the new status, or a refusal, from the current one (and stock, for restore). */
function nextStatus(action: StatusAction, current: ItemStatus, totalStock: number): ItemStatus | "deleted" | { error: string } {
  switch (action) {
    case "publish":
      return current === "draft" ? "active" : { error: "Only drafts can be published." };
    case "archive":
      return current === "archived" ? { error: "This item is already archived." } : "archived";
    case "restore":
      // Back into inventory as what the stock says: nothing left → sold out.
      return current === "archived" ? (totalStock > 0 ? "active" : "sold_out") : { error: "Only archived items can be restored." };
    case "delete":
      return current === "draft" ? "deleted" : { error: "Only drafts can be deleted. Archive this item instead." };
  }
}

export async function changeItemStatus(action: StatusAction, id: string, version: string, user: GuardUser): Promise<NextResponse> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT i.status, (i.updated_at = $2::timestamptz) AS fresh,
              COALESCE((SELECT SUM(v.quantity) FROM variants v WHERE v.item_id = i.id AND v.deleted_at IS NULL), 0)::int AS "totalStock"
       FROM items i
       WHERE i.id = $1 AND i.deleted_at IS NULL
       FOR UPDATE OF i`,
      [id, version],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(404, "Item not found");
    }
    const { status, fresh, totalStock } = rows[0] as { status: ItemStatus; fresh: boolean; totalStock: number };
    if (!fresh) {
      await client.query("ROLLBACK");
      return fail(409, STALE);
    }
    const next = nextStatus(action, status, totalStock);
    if (typeof next === "object") {
      await client.query("ROLLBACK");
      return fail(400, next.error);
    }

    const updated =
      next === "deleted"
        ? await client.query(
            `UPDATE items SET deleted_at = now(), updated_at = now(), updated_by = $2 WHERE id = $1 RETURNING updated_at::text AS version`,
            [id, user.id],
          )
        : await client.query(
            `UPDATE items SET status = $3, updated_at = now(), updated_by = $2 WHERE id = $1 RETURNING updated_at::text AS version`,
            [id, user.id, next],
          );

    await logActivity(client, {
      actorId: user.id,
      action: LOG_ACTION[action],
      entityType: "item",
      entityId: id,
      payload: next === "deleted" ? { before: { status }, after: { deleted: true } } : { before: { status }, after: { status: next } },
    });
    await client.query("COMMIT");
    return NextResponse.json({ data: next === "deleted" ? { id, deleted: true } : { id, status: next, version: updated.rows[0].version } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (process.env.NODE_ENV === "development") console.error(`item ${action} failed:`, error);
    return fail(500, "The change was not saved. Try again.");
  } finally {
    client.release();
  }
}
