import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Publish / archive / restore / delete on real Postgres, with real version tokens.
//   TEST_DATABASE_URL=postgres://… npm run test:db

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) process.env.DATABASE_URL = URL_;
const who = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: async () => ({ user: { id: who.id, name: "Status test", role: "owner" }, session: { id: "s" } }) } },
}));

describe.skipIf(!URL_)("item status actions (Postgres)", () => {
  const client = new pg.Client({ connectionString: URL_ });
  const userId = randomUUID();
  const itemId = randomUUID();
  const draftId = randomUUID();
  type H = (r: Request, c: { params: { id: string } }) => Promise<Response>;
  let publish: H, archive: H, restore: H, del: H;
  let version: (id: string) => Promise<string>;
  let endPool: () => Promise<void>;

  const send = async (h: H, id: string, v: string, method = "POST") => {
    const res = await h(
      new Request(`http://localhost:3000/api/items/${id}`, {
        method,
        headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({ version: v }),
      }),
      { params: { id } },
    );
    return { status: res.status, body: await res.json() };
  };
  const status = async (id: string) => (await client.query(`SELECT status, deleted_at IS NOT NULL AS deleted FROM items WHERE id = $1`, [id])).rows[0];

  beforeAll(async () => {
    who.id = userId;
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    await client.query(`INSERT INTO users (id, name, email, role) VALUES ($1, 'Status test', $2, 'owner')`, [userId, `${userId}@example.invalid`]);
    await client.query(`INSERT INTO items (id, title, selling_price, status) VALUES ($1, 'Status test', 999, 'draft'), ($2, 'Status draft', 999, 'draft')`, [itemId, draftId]);
    await client.query(`INSERT INTO variants (item_id, size, quantity) VALUES ($1, 'M', 0)`, [itemId]);
    ({ POST: publish } = await import("@/app/api/items/[id]/publish/route"));
    ({ POST: archive } = await import("@/app/api/items/[id]/archive/route"));
    ({ POST: restore } = await import("@/app/api/items/[id]/restore/route"));
    ({ DELETE: del } = await import("@/app/api/items/[id]/route"));
    const items = await import("@/lib/items");
    version = async (id) => (await items.loadItemFull(id))!.version;
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    await client.query(`DELETE FROM activity_log WHERE entity_id = ANY($1::uuid[])`, [[itemId, draftId]]);
    await client.query(`DELETE FROM items WHERE id = ANY($1::uuid[])`, [[itemId, draftId]]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.end();
    await endPool?.();
  });

  it("publish → archive (a stale token gets 409) → restore by stock → delete drafts only, all logged", async () => {
    const v0 = await version(itemId);
    const p = await send(publish, itemId, v0);
    expect(p).toMatchObject({ status: 200, body: { data: { status: "active" } } });
    expect(p.body.data.version).not.toBe(v0);

    expect((await send(archive, itemId, v0)).status).toBe(409); // loaded before the publish
    expect((await status(itemId)).status).toBe("active");

    const a = await send(archive, itemId, p.body.data.version);
    expect(a.body.data.status).toBe("archived");

    const r1 = await send(restore, itemId, a.body.data.version);
    expect(r1.body.data.status).toBe("sold_out"); // no live stock

    const a2 = await send(archive, itemId, r1.body.data.version);
    await client.query(`UPDATE variants SET quantity = 2 WHERE item_id = $1`, [itemId]);
    expect((await send(restore, itemId, a2.body.data.version)).body.data.status).toBe("active");

    expect((await send(del, itemId, await version(itemId), "DELETE")).status).toBe(400); // not a draft
    expect((await send(del, draftId, await version(draftId), "DELETE")).body.data).toEqual({ id: draftId, deleted: true });
    expect(await status(draftId)).toMatchObject({ deleted: true });

    const actions = (await client.query(`SELECT action FROM activity_log WHERE entity_id = $1 ORDER BY created_at, id`, [itemId])).rows.map((r) => r.action);
    expect(actions.sort()).toEqual(["item.archived", "item.archived", "item.published", "item.restored", "item.restored"]);
  });

  it("a token 0.5 ms older than the item is refused (409)", async () => {
    await client.query(`UPDATE items SET updated_at = '2026-10-18 06:12:00.123000+00' WHERE id = $1`, [itemId]);
    const older = await version(itemId);
    await client.query(`UPDATE items SET updated_at = '2026-10-18 06:12:00.123500+00' WHERE id = $1`, [itemId]);
    expect((await send(archive, itemId, older)).status).toBe(409);
    expect((await send(archive, itemId, await version(itemId))).status).toBe(200);
  });
});
