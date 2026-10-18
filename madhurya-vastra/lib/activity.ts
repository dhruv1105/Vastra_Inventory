import type { PoolClient } from "pg";
import { query } from "@/lib/db";
import { forRole } from "@/lib/cost";
import type { Role } from "@/lib/auth/roles";

// activity_log: the one module that reads it (a test fails if anything else does).
// Writes may carry cost in their before/after (the owner's history needs it); every READ goes
// through readActivity(), which builds each entry field by field and passes the payload through the
// central cost filter (lib/cost.ts), so sellers never see cost — whatever the payload looks like.

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: { id: string; name: string } | null;
  createdAt: string;
  payload: unknown;
};

type Run = (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

/** Append one entry. Call inside the same transaction as the change it records. */
export async function logActivity(
  client: PoolClient,
  e: { actorId: string; action: string; entityType: string; entityId: string; payload: unknown },
): Promise<void> {
  await client.query(
    `INSERT INTO activity_log (actor_id, action, entity_type, entity_id, payload, created_by) VALUES ($1, $2, $3, $4, $5, $1)`,
    [e.actorId, e.action, e.entityType, e.entityId, JSON.stringify(e.payload ?? {})],
  );
}

/** Newest first, for one record, as `role` may see it. */
export async function readActivity(
  where: { entityType: string; entityId: string; limit?: number },
  role: Role,
  run: Run = (t, p) => query(t, p),
): Promise<ActivityEntry[]> {
  const limit = Math.min(Math.max(where.limit ?? 20, 1), 100);
  const { rows } = await run(
    `SELECT a.id, a.action, a.entity_type AS "entityType", a.entity_id AS "entityId", a.payload,
            a.created_at AS "createdAt",
            CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'name', u.name) END AS actor
     FROM activity_log a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.entity_type = $1 AND a.entity_id = $2
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $3`,
    [where.entityType, where.entityId, limit],
  );
  return rows.map((r) => {
    const actor = r.actor as { id: string; name: string } | null;
    const entry: ActivityEntry = {
      id: String(r.id),
      action: String(r.action),
      entityType: String(r.entityType),
      entityId: String(r.entityId),
      actor: actor && { id: actor.id, name: actor.name },
      createdAt: r.createdAt as string,
      payload: r.payload ?? {},
    };
    return forRole(entry, role);
  });
}
