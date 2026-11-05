import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { pool, query } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requireUser, UUID } from "@/lib/auth/guard";
import { isTemplateKind, templateProblem, type TemplateKind } from "@/lib/caption";

// Route handlers for /api/caption-templates and /api/caption-templates/[id] (docs/plans/sharing.md).
// Owner and sellers may read and change them (owner's answer, 2026-11-05); every change is logged.
// A template's kind never changes. Making one the default clears the old default of the same kind
// in the same transaction (the partial unique index caption_templates_live_default_unique backs it).

const COLUMNS = `id, kind, name, body, default_details AS "defaultDetails", is_default AS "isDefault", updated_at AS "updatedAt"`;
const NOT_FOUND = "This template no longer exists. Reload to see the current list.";
const DUPLICATE = "A template with this name already exists";
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const isUniqueViolation = (e: unknown) => !!e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505";

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function inTransaction<T>(work: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await work(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Defaults first, then by name, captions before shop details. */
export async function GET(request: Request) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  try {
    const { rows } = await query(
      `SELECT ${COLUMNS} FROM caption_templates WHERE deleted_at IS NULL ORDER BY kind ASC, is_default DESC, lower(name) ASC`,
    );
    return NextResponse.json({ data: rows });
  } catch {
    return fail("Internal server error", 500);
  }
}

/** { kind, name, body, defaultDetails?, isDefault? } */
export async function POST(request: Request) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  const body = await readBody(request);
  if (!body) return fail("Invalid JSON body");
  if (!isTemplateKind(body.kind)) return fail("Choose caption or shop details");
  const kind: TemplateKind = body.kind;
  const problem = templateProblem(kind, body);
  if (problem) return fail(problem);
  if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") return fail("Invalid default flag");
  const isDefault = body.isDefault === true;
  const details = kind === "caption" ? ((body.defaultDetails as string[] | undefined) ?? []) : [];
  try {
    const row = await inTransaction(async (c) => {
      if (isDefault) await clearDefault(c, kind, g.user.id);
      const { rows } = await c.query(
        `INSERT INTO caption_templates (kind, name, body, default_details, is_default, created_by, updated_by)
         VALUES ($1, $2, $3, $4::text[], $5, $6, $6) RETURNING ${COLUMNS}`,
        [kind, String(body.name).trim(), body.body, Array.from(new Set(details)), isDefault, g.user.id],
      );
      const created = rows[0] as { id: string; name: string };
      await logActivity(c, { actorId: g.user.id, action: "caption_template.created", entityType: "caption_template", entityId: created.id, payload: { kind, name: created.name, isDefault } });
      return created;
    });
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return fail(DUPLICATE, 409);
    if (process.env.NODE_ENV === "development") console.error(e);
    return fail("Internal server error", 500);
  }
}

const clearDefault = (c: PoolClient, kind: TemplateKind, userId: string, except?: string) =>
  c.query(
    `UPDATE caption_templates SET is_default = false, updated_by = $2, updated_at = NOW()
     WHERE kind = $1 AND is_default AND deleted_at IS NULL AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [kind, userId, except ?? null],
  );

type Ctx = { params: { id: string } };

/** Any of { name, body, defaultDetails, isDefault }; fields left out are kept. */
export async function PATCH(request: Request, { params }: Ctx) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return fail(NOT_FOUND, 404);
  const body = await readBody(request);
  if (!body) return fail("Invalid JSON body");
  if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") return fail("Invalid default flag");
  if (body.kind !== undefined) return fail("A template's kind can't be changed");
  try {
    const out = await inTransaction(async (c) => {
      const { rows: found } = await c.query(
        `SELECT kind FROM caption_templates WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [params.id],
      );
      if (found.length === 0) return { status: 404 as const };
      const kind = (found[0] as { kind: TemplateKind }).kind;
      const problem = templateProblem(kind, body, true);
      if (problem) return { status: 400 as const, problem };
      if (body.isDefault === true) await clearDefault(c, kind, g.user.id, params.id);
      const details = body.defaultDetails === undefined ? null : Array.from(new Set(body.defaultDetails as string[]));
      const { rows } = await c.query(
        `UPDATE caption_templates SET
           name = COALESCE($2, name), body = COALESCE($3, body),
           default_details = COALESCE($4::text[], default_details), is_default = COALESCE($5, is_default),
           updated_by = $6, updated_at = NOW()
         WHERE id = $1 RETURNING ${COLUMNS}`,
        [params.id, typeof body.name === "string" ? body.name.trim() : null, (body.body as string | undefined) ?? null, details, (body.isDefault as boolean | undefined) ?? null, g.user.id],
      );
      const row = rows[0] as { id: string; name: string };
      const changed = ["name", "body", "defaultDetails", "isDefault"].filter((k) => body[k] !== undefined);
      await logActivity(c, { actorId: g.user.id, action: "caption_template.updated", entityType: "caption_template", entityId: row.id, payload: { kind, name: row.name, changed } });
      return { status: 200 as const, row };
    });
    if (out.status === 404) return fail(NOT_FOUND, 404);
    if (out.status === 400) return fail(out.problem);
    return NextResponse.json({ data: out.row });
  } catch (e) {
    if (isUniqueViolation(e)) return fail(DUPLICATE, 409);
    if (process.env.NODE_ENV === "development") console.error(e);
    return fail("Internal server error", 500);
  }
}

/** Soft delete. Deleting the default leaves that kind with none (the share sheet then uses the first). */
export async function DELETE(request: Request, { params }: Ctx) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return fail(NOT_FOUND, 404);
  try {
    const row = await inTransaction(async (c) => {
      const { rows } = await c.query(
        `UPDATE caption_templates SET deleted_at = NOW(), is_default = false, updated_by = $2, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL RETURNING id, kind, name`,
        [params.id, g.user.id],
      );
      const r = rows[0] as { id: string; kind: string; name: string } | undefined;
      if (r) await logActivity(c, { actorId: g.user.id, action: "caption_template.deleted", entityType: "caption_template", entityId: r.id, payload: { kind: r.kind, name: r.name } });
      return r;
    });
    if (!row) return fail(NOT_FOUND, 404);
    return NextResponse.json({ data: { id: row.id } });
  } catch {
    return fail("Internal server error", 500);
  }
}

/** Text-only share of a caption (no item): logs caption.shared with the template's name. */
export async function SHARE(request: Request, { params }: Ctx) {
  const g = await requireUser(request);
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return fail(NOT_FOUND, 404);
  try {
    const row = await inTransaction(async (c) => {
      const { rows } = await c.query(`SELECT id, name FROM caption_templates WHERE id = $1 AND kind = 'caption' AND deleted_at IS NULL`, [params.id]);
      const r = rows[0] as { id: string; name: string } | undefined;
      if (r) await logActivity(c, { actorId: g.user.id, action: "caption.shared", entityType: "caption_template", entityId: r.id, payload: { template: r.name } });
      return r;
    });
    if (!row) return fail(NOT_FOUND, 404);
    return NextResponse.json({ data: { logged: true } });
  } catch {
    return fail("Internal server error", 500);
  }
}
