import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Caption templates on real Postgres: one default per kind, names unique per kind among live rows,
// deleting frees the name, and the seed re-runs without bringing deleted templates back.
//   TEST_DATABASE_URL=postgres://… npm run test:db

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) process.env.DATABASE_URL = URL_;
const who = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: async () => ({ user: { id: who.id, name: "Caption test", role: "seller" }, session: { id: "s" } }) } },
}));

describe.skipIf(!URL_)("caption templates (Postgres)", () => {
  const client = new pg.Client({ connectionString: URL_ });
  const userId = randomUUID();
  const tag = `t${userId.slice(0, 8)}`;
  type H = (r: Request, c: { params: { id: string } }) => Promise<Response>;
  let POST: (r: Request) => Promise<Response>, PATCH: H, DELETE: H;
  let endPool: () => Promise<void>;

  const send = async (method: string, body?: unknown, id?: string) => {
    const r = new Request(`http://localhost:3000/api/caption-templates${id ? `/${id}` : ""}`, {
      method,
      headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = id ? await (method === "PATCH" ? PATCH : DELETE)(r, { params: { id } }) : await POST(r);
    return { status: res.status, body: await res.json() };
  };
  const defaults = async () =>
    (await client.query(`SELECT name FROM caption_templates WHERE kind = 'shop_details' AND is_default AND deleted_at IS NULL`)).rows.map((r) => r.name);

  beforeAll(async () => {
    who.id = userId;
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    await client.query(`INSERT INTO users (id, name, email, role) VALUES ($1, 'Caption test', $2, 'seller')`, [userId, `${userId}@example.invalid`]);
    ({ POST } = await import("@/app/api/caption-templates/route"));
    ({ PATCH, DELETE } = await import("@/app/api/caption-templates/[id]/route"));
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    await client.query(`DELETE FROM activity_log WHERE actor_id = $1`, [userId]);
    await client.query(`DELETE FROM caption_templates WHERE created_by = $1 OR name LIKE $2`, [userId, `${tag}%`]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await endPool?.();
    await client.end();
  });

  it("making a template the default moves the default; there is never more than one per kind", async () => {
    const a = await send("POST", { kind: "shop_details", name: `${tag} A`, body: "Shop A", isDefault: true });
    expect(a.status).toBe(201);
    const b = await send("POST", { kind: "shop_details", name: `${tag} B`, body: "Shop B", isDefault: true });
    expect(b.status).toBe(201);
    expect(await defaults()).toEqual([`${tag} B`]);
    expect((await send("PATCH", { isDefault: true }, a.body.data.id)).status).toBe(200);
    expect(await defaults()).toEqual([`${tag} A`]);
    // A caption default is separate from a shop-details default.
    const c = await send("POST", { kind: "caption", name: `${tag} A`, body: "{title}", isDefault: true });
    expect(c.status).toBe(201);
    expect(await defaults()).toEqual([`${tag} A`]);
    // The index refuses a second live default even without the route.
    await expect(client.query(`UPDATE caption_templates SET is_default = true WHERE id = $1`, [b.body.data.id])).rejects.toMatchObject({ code: "23505" });
  });

  it("names are unique per kind, ignoring case; deleting frees the name and drops the default", async () => {
    const dup = await send("POST", { kind: "shop_details", name: `${tag} a`, body: "x" });
    expect(dup).toEqual({ status: 409, body: { error: "A template with this name already exists" } });
    const id = (await client.query(`SELECT id FROM caption_templates WHERE name = $1 AND kind = 'shop_details'`, [`${tag} A`])).rows[0].id;
    expect((await send("DELETE", undefined, id)).status).toBe(200);
    expect(await defaults()).toEqual([]);
    expect((await send("POST", { kind: "shop_details", name: `${tag} A`, body: "Again" })).status).toBe(201);
  });

  it("the seed re-runs without bringing back or duplicating templates", async () => {
    const seed = await readFile(path.join(__dirname, "..", "..", "db", "seeds", "020_caption_templates.sql"), "utf8");
    await client.query(seed);
    const before = (await client.query(`SELECT count(*)::int AS n FROM caption_templates`)).rows[0].n;
    await client.query(seed);
    expect((await client.query(`SELECT count(*)::int AS n FROM caption_templates`)).rows[0].n).toBe(before);
  });
});
