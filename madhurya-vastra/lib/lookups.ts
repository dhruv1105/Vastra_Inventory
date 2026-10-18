import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireUser, UUID } from "@/lib/auth/guard";
import type { Role } from "@/lib/auth/roles";

// The four Manage Lists tables (item_types, colors, occasions, tags) share one set of route
// handlers. Each app/api/lookups/<list>/route.ts just binds a config.

export type LookupConfig = {
  table: "item_types" | "colors" | "occasions" | "tags";
  /** For messages: "type" → "This type already exists". */
  noun: string;
  hasColor?: boolean;
  /** Who may add values. Item types can be added by sellers from Add Item; the rest by the owner. */
  createRole?: Role;
};

const NAME_MAX = 50;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const columns = (c: LookupConfig) =>
  `id, name, ${c.hasColor ? 'hex_code AS "hexCode", hex_code_2 AS "hexCode2", ' : ""}created_at AS "createdAt"`;
const isUniqueViolation = (e: unknown) => !!e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505";
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}

function validate(c: LookupConfig, body: Record<string, unknown>, partial: boolean): string | null {
  const name = body.name;
  if (!partial || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return partial ? "Name cannot be empty" : "Name is required";
    if (name.trim().length > NAME_MAX) return `Name must be ${NAME_MAX} characters or less`;
  }
  for (const key of ["hexCode", "hexCode2"]) {
    const v = body[key];
    if (c.hasColor && v != null && v !== "" && !(typeof v === "string" && HEX.test(v))) return "Hex code must be in #RRGGBB format";
  }
  return null;
}

/** Change + activity_log in one transaction. */
async function write<T>(sql: string, params: unknown[], log: { actor: string; action: string; entityId?: string; payload: object }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(sql, params);
    const row = res.rows[0] as (T & { id: string }) | undefined;
    if (row || log.entityId) {
      await client.query(
        `INSERT INTO activity_log (actor_id, action, entity_type, entity_id, payload, created_by) VALUES ($1, $2, 'lookup', $3, $4, $1)`,
        [log.actor, log.action, row?.id ?? log.entityId, JSON.stringify(log.payload)],
      );
    }
    await client.query("COMMIT");
    return row;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export function lookupCollection(c: LookupConfig) {
  return {
    async GET(request: Request) {
      const g = await requireUser(request);
      if (g.response) return g.response;
      try {
        const result = await query(`SELECT ${columns(c)} FROM ${c.table} WHERE deleted_at IS NULL ORDER BY name ASC`);
        return NextResponse.json({ data: result.rows });
      } catch {
        return bad("Internal server error", 500);
      }
    },

    async POST(request: Request) {
      const g = await requireUser(request, { role: c.createRole ?? "owner" });
      if (g.response) return g.response;
      const body = await readBody(request);
      if (!body) return bad("Invalid JSON body");
      const problem = validate(c, body, false);
      if (problem) return bad(problem);
      const name = String(body.name).trim();
      try {
        const row = await write(
          c.hasColor
            ? `INSERT INTO ${c.table} (name, hex_code, hex_code_2, created_by, updated_by) VALUES ($1, $2, $3, $4, $4) RETURNING ${columns(c)}`
            : `INSERT INTO ${c.table} (name, created_by, updated_by) VALUES ($1, $2, $2) RETURNING ${columns(c)}`,
          c.hasColor ? [name, (body.hexCode as string) || null, (body.hexCode2 as string) || null, g.user.id] : [name, g.user.id],
          { actor: g.user.id, action: `${c.table}.created`, payload: { name } },
        );
        return NextResponse.json({ data: row }, { status: 201 });
      } catch (e) {
        if (isUniqueViolation(e)) return bad(`This ${c.noun} already exists`, 409);
        return bad("Internal server error", 500);
      }
    },
  };
}

export function lookupItem(c: LookupConfig) {
  return {
    async PATCH(request: Request, { params }: { params: { id: string } }) {
      const g = await requireUser(request, { role: "owner" });
      if (g.response) return g.response;
      if (!UUID.test(params.id)) return bad(`${capital(c.noun)} not found`, 404);
      const body = await readBody(request);
      if (!body) return bad("Invalid JSON body");
      const problem = validate(c, body, true);
      if (problem) return bad(problem);
      const name = typeof body.name === "string" ? body.name.trim() : null;
      try {
        const row = await write(
          c.hasColor
            ? `UPDATE ${c.table} SET name = COALESCE($1, name),
                 hex_code = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE hex_code END,
                 hex_code_2 = CASE WHEN $5::boolean THEN $6::text ELSE hex_code_2 END,
                 updated_by = $3, updated_at = NOW()
               WHERE id = $4 AND deleted_at IS NULL RETURNING ${columns(c)}`
            : `UPDATE ${c.table} SET name = COALESCE($1, name), updated_by = $2, updated_at = NOW()
               WHERE id = $3 AND deleted_at IS NULL RETURNING ${columns(c)}`,
          c.hasColor
            ? // hexCode2: left out → kept; null or "" → cleared (no longer a combination); a code → set.
              [name, (body.hexCode as string) || null, g.user.id, params.id, body.hexCode2 !== undefined, (body.hexCode2 as string) || null]
            : [name, g.user.id, params.id],
          { actor: g.user.id, action: `${c.table}.updated`, payload: { name } },
        );
        if (!row) return bad(`${capital(c.noun)} not found`, 404);
        return NextResponse.json({ data: row });
      } catch (e) {
        if (isUniqueViolation(e)) return bad(`This ${c.noun} already exists`, 409);
        return bad("Internal server error", 500);
      }
    },

    async DELETE(request: Request, { params }: { params: { id: string } }) {
      const g = await requireUser(request, { role: "owner" });
      if (g.response) return g.response;
      if (!UUID.test(params.id)) return bad(`${capital(c.noun)} not found`, 404);
      try {
        const row = await write(
          `UPDATE ${c.table} SET deleted_at = NOW(), updated_at = NOW(), updated_by = $1
           WHERE id = $2 AND deleted_at IS NULL RETURNING id, name`,
          [g.user.id, params.id],
          { actor: g.user.id, action: `${c.table}.deleted`, payload: {} },
        );
        if (!row) return bad(`${capital(c.noun)} not found`, 404);
        return NextResponse.json({ success: true });
      } catch {
        return bad("Internal server error", 500);
      }
    },
  };
}
