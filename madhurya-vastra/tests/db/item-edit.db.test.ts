import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// PATCH /api/items/[id] on real Postgres: real versions, the live-variant index, photo files.
//   TEST_DATABASE_URL=postgres://… npm run test:db

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) process.env.DATABASE_URL = URL_;
const who = vi.hoisted(() => ({ id: "", role: "owner" as "owner" | "seller" }));
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: async () => ({ user: { id: who.id, name: "Edit test", role: who.role }, session: { id: "s" } }) } },
}));

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").toString("base64");

describe.skipIf(!URL_)("item edit (Postgres)", () => {
  const client = new pg.Client({ connectionString: URL_ });
  const token = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const itemId = randomUUID();
  const pieceId = randomUUID();
  let red = "";
  type H = (r: Request, c: { params: { id: string } }) => Promise<Response>;
  let patch: H;
  let activity: H;
  let endPool: () => Promise<void>;

  type Body = Record<string, unknown>;
  const send = async (h: H, id: string, method: string, body?: unknown) => {
    const res = await h(
      new Request(`http://localhost:3000/api/items/${id}`, {
        method,
        headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      { params: { id } },
    );
    return { status: res.status, body: await res.json() };
  };
  const get = async (id: string) => (await import("@/lib/items")).loadItemFull(id);
  /** The edit form's save for the item as stored now, with `extra` on top. */
  const form = async (id: string, extra: Body = {}): Promise<Body> => {
    const it = (await get(id))!;
    return {
      version: it.version,
      title: it.title,
      description: it.description,
      itemTypeId: it.itemTypeId,
      wearType: it.wearType,
      sellingPrice: it.sellingPrice,
      costPrice: it.costPrice,
      occasionIds: it.occasions.map((o) => o.id),
      tagIds: it.tags.map((t) => t.id),
      isOneOfAKind: it.isOneOfAKind,
      variants: it.variants.map((v) => ({ size: v.size, colorId: v.colorId, sellingPriceOverride: v.sellingPriceOverride, costPriceOverride: v.costPriceOverride ?? null })),
      images: { keep: it.images.map((p) => ({ id: p.id, displayOrder: p.displayOrder, altText: p.altText })), add: [] },
      ...extra,
    };
  };
  const uploads = (id: string) => path.join(process.cwd(), "public", "uploads", "items", id);

  beforeAll(async () => {
    who.id = userId;
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    await client.query(`INSERT INTO users (id, name, email, role) VALUES ($1, 'Edit test', $2, 'owner')`, [userId, `${userId}@example.invalid`]);
    red = (await client.query(`INSERT INTO colors (name) VALUES ($1) RETURNING id`, [`Edit red ${token}`])).rows[0].id;
    await client.query(
      `INSERT INTO items (id, title, wear_type, selling_price, cost_price, status, is_one_of_a_kind)
       VALUES ($1, 'Edit test', 'both', 2999, 1500, 'active', false), ($2, 'Edit piece', 'both', 4999, NULL, 'active', true)`,
      [itemId, pieceId],
    );
    await client.query(`INSERT INTO variants (item_id, size, color_id, quantity, display_order) VALUES ($1, 'M', $2, 2, 0), ($1, 'L', $2, 0, 1)`, [itemId, red]);
    await client.query(`INSERT INTO variants (item_id, size, quantity) VALUES ($1, 'One Size', 1)`, [pieceId]);
    ({ PATCH: patch } = await import("@/app/api/items/[id]/route"));
    ({ GET: activity } = await import("@/app/api/items/[id]/activity/route"));
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    await client.query(`DELETE FROM activity_log WHERE entity_id = ANY($1::uuid[])`, [[itemId, pieceId]]);
    await client.query(`DELETE FROM items WHERE id = ANY($1::uuid[])`, [[itemId, pieceId]]);
    await client.query(`DELETE FROM colors WHERE id = $1`, [red]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    fs.rmSync(uploads(itemId), { recursive: true, force: true });
    await client.end();
    await endPool?.();
  });

  it("two saves from the same version: the first wins, the second gets 409 and changes nothing", async () => {
    who.role = "owner";
    const first = await form(itemId, { title: "Edit test — first" });
    const second = { ...first, title: "Edit test — second" };
    expect((await send(patch, itemId, "PATCH", first)).status).toBe(200);
    const res = await send(patch, itemId, "PATCH", second);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Someone else changed this item/);
    expect((await get(itemId))!.title).toBe("Edit test — first");
  });

  it("two saves at the same moment: exactly one is saved", async () => {
    const base = await form(itemId);
    const results = await Promise.all([
      send(patch, itemId, "PATCH", { ...base, title: "Racer A" }),
      send(patch, itemId, "PATCH", { ...base, title: "Racer B" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = results.find((r) => r.status === 200)!.body.data.title;
    expect((await get(itemId))!.title).toBe(winner);
  });

  it("the response carries the new version; saving again from it works", async () => {
    const res = await send(patch, itemId, "PATCH", await form(itemId, { title: "Edit test" }));
    const again = await send(patch, itemId, "PATCH", { ...(await form(itemId)), version: res.body.data.version, description: "Soft georgette" });
    expect(again.status).toBe(200);
  });

  it("a live duplicate size is refused with a sentence; a removed size can be added back", async () => {
    const base = await form(itemId);
    const dup = await send(patch, itemId, "PATCH", { ...base, variants: [...(base.variants as Body[]), { size: " m ", colorId: red }] });
    expect(dup.status).toBe(400);
    expect(dup.body.error).toMatch(/only once/);

    const withoutL = (base.variants as Body[]).filter((v) => v.size !== "L");
    expect((await send(patch, itemId, "PATCH", { ...base, variants: withoutL })).status).toBe(200);
    const again = await form(itemId);
    const res = await send(patch, itemId, "PATCH", { ...again, variants: [...withoutL, { size: "l", colorId: red, quantity: 5 }] });
    expect(res.status).toBe(200);
    const rows = (await client.query(`SELECT quantity, deleted_at IS NULL AS live FROM variants WHERE item_id = $1 AND size = 'L' ORDER BY created_at`, [itemId])).rows;
    expect(rows).toEqual([{ quantity: 0, live: false }, { quantity: 0, live: true }]); // new row, quantity 0 whatever was sent
  });

  it("removing a size that still has stock is refused", async () => {
    const base = await form(itemId);
    const res = await send(patch, itemId, "PATCH", { ...base, variants: (base.variants as Body[]).filter((v) => v.size !== "M") });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/M × Edit red .* \(2 left\)/);
  });

  it("history: before/after of what changed, with names; cost for the owner only", async () => {
    who.role = "owner";
    const base = await form(itemId);
    await send(patch, itemId, "PATCH", { ...base, sellingPrice: 3199, costPrice: 1600 });
    const owner = (await send(activity, itemId, "GET")).body.data[0];
    expect(owner.action).toBe("item.updated");
    expect(owner.payload).toEqual({ before: { sellingPrice: 2999, costPrice: 1500 }, after: { sellingPrice: 3199, costPrice: 1600 } });
    who.role = "seller";
    const seller = (await send(activity, itemId, "GET")).body.data[0];
    expect(seller.payload).toEqual({ before: { sellingPrice: 2999 }, after: { sellingPrice: 3199 } });
    who.role = "owner";
  });

  it("a seller's save keeps the cost price and is logged as theirs", async () => {
    who.role = "seller";
    const base = await form(itemId);
    const res = await send(patch, itemId, "PATCH", { ...base, costPrice: 1, sellingPrice: 3299 });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/cost/i);
    expect((await client.query(`SELECT cost_price::text AS c FROM items WHERE id = $1`, [itemId])).rows[0].c).toBe("1600.00");
    who.role = "owner";
  });

  it("photos: an added file is written; a removed photo is soft-deleted and its file kept", async () => {
    const base = await form(itemId);
    const add = await send(patch, itemId, "PATCH", { ...base, images: { keep: [], add: [{ base64: PNG, mimeType: "image/png", altText: "Front" }] } });
    expect(add.status).toBe(200);
    const [photo] = add.body.data.images;
    const file = path.join(process.cwd(), "public", photo.cdnUrl);
    expect(fs.existsSync(file)).toBe(true);

    const removed = await send(patch, itemId, "PATCH", await form(itemId, { images: { keep: [], add: [] } }));
    expect(removed.status).toBe(200);
    expect(removed.body.data.images).toEqual([]);
    expect((await client.query(`SELECT deleted_at IS NOT NULL AS gone FROM images WHERE id = $1`, [photo.id])).rows[0].gone).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("a save that fails after writing a photo removes the file again", async () => {
    const before = fs.readdirSync(uploads(itemId)).length;
    const res = await send(
      patch,
      itemId,
      "PATCH",
      await form(itemId, { itemTypeId: randomUUID(), images: { keep: [], add: [{ base64: PNG, mimeType: "image/png" }] } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer exists/);
    expect(fs.readdirSync(uploads(itemId)).length).toBe(before);
  });

  it("one of a kind off: the piece becomes One Size × colour, quantity kept, then sizes can be added", async () => {
    const base = await form(pieceId);
    const res = await send(patch, pieceId, "PATCH", {
      ...base,
      isOneOfAKind: false,
      oneOfAKindColorId: red,
      variants: [{ size: "One Size", colorId: red }, { size: "M", colorId: red }],
    });
    expect(res.status).toBe(200);
    const it = (await get(pieceId))!;
    expect(it.isOneOfAKind).toBe(false);
    expect(it.variants.map((v) => [v.size, v.colorId, v.quantity])).toEqual([
      ["One Size", red, 1],
      ["M", red, 0],
    ]);
    const entry = (await send(activity, pieceId, "GET")).body.data[0];
    expect(entry.payload.before).toEqual({ isOneOfAKind: true });
    expect(entry.payload.variants.added).toEqual([`M × Edit red ${token}`]);
    expect(entry.payload.variants.changed).toEqual([{ variant: "One Size", before: { colorName: null }, after: { colorName: `Edit red ${token}` } }]);
  });
});
