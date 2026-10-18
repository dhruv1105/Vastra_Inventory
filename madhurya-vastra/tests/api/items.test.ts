import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results, sqlLike } from "../helpers";
import * as items from "@/app/api/items/route";
import * as item from "@/app/api/items/[id]/route";

const ID = "22222222-2222-2222-2222-222222222222";
const body = (extra: object = {}) => ({
  title: "Lavender Georgette Saree",
  wearType: "both",
  sellingPrice: 1999,
  costPrice: 1200,
  variants: [{ size: "M", colorId: null, quantity: 2, costPriceOverride: 900 }],
  userId: OWNER.id,
  ...extra,
});

describe("POST /api/items", () => {
  beforeEach(() => reset(null));

  it("without a session → 401, runs no SQL", async () => {
    expect((await items.POST(req("POST", "/api/items", { body: body() }))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("from another site → 403", async () => {
    reset(OWNER);
    expect((await items.POST(req("POST", "/api/items", { body: body(), origin: "https://evil.example" }))).status).toBe(403);
  });

  it("as a seller: saved as the seller, cost prices dropped, body userId ignored", async () => {
    reset(SELLER);
    results.push({ match: "INSERT INTO items", rows: [{ id: ID, title: "Lavender Georgette Saree", status: "active" }] });
    const res = await items.POST(req("POST", "/api/items", { body: body() }));
    expect(res.status).toBe(201);
    const insertItem = calls.find(([sql]) => sql.includes("INSERT INTO items"))!;
    const params = insertItem[1]!;
    expect(params[4]).toBeNull(); // cost_price
    expect(params[7]).toBe(SELLER.id); // created_by / updated_by
    expect(params).not.toContain(OWNER.id);
    const insertVariant = calls.find(([sql]) => sql.includes("INSERT INTO variants"))!;
    expect(insertVariant[1]![5]).toBeNull(); // cost_price_override
  });

  it("as the owner: cost price kept", async () => {
    reset(OWNER);
    results.push({ match: "INSERT INTO items", rows: [{ id: ID, title: "x", status: "active" }] });
    await items.POST(req("POST", "/api/items", { body: body() }));
    expect(calls.find(([sql]) => sql.includes("INSERT INTO items"))![1]![4]).toBe(1200);
  });
});

describe("POST /api/items — one-of-a-kind flag", () => {
  beforeEach(() => reset(OWNER));
  const oneOff = (extra: object = {}) =>
    body({ isOneOfAKind: true, variants: [{ size: "One Size", colorId: null, quantity: 1 }], ...extra });
  const insertParams = () => calls.find(([sql]) => sql.includes("INSERT INTO items"))![1]!;
  const okInsert = () => results.push({ match: "INSERT INTO items", rows: [{ id: ID, title: "x", status: "active" }] });

  it("stores is_one_of_a_kind = true when Add Item sends it", async () => {
    okInsert();
    expect((await items.POST(req("POST", "/api/items", { body: oneOff() }))).status).toBe(201);
    expect(calls.find(([sql]) => sql.includes("INSERT INTO items"))![0]).toContain("is_one_of_a_kind");
    expect(insertParams()[8]).toBe(true);
  });

  it("defaults to false when the flag is left out", async () => {
    okInsert();
    await items.POST(req("POST", "/api/items", { body: body() }));
    expect(insertParams()[8]).toBe(false);
  });

  it.each([
    ["not a boolean", { isOneOfAKind: "yes" }, /flag/],
    ["two variants", { variants: [{ size: "One Size", colorId: null, quantity: 1 }, { size: "M", colorId: null, quantity: 1 }] }, /single piece/],
    ["a colour", { variants: [{ size: "One Size", colorId: ID, quantity: 1 }] }, /single piece/],
    ["another size", { variants: [{ size: "M", colorId: null, quantity: 1 }] }, /single piece/],
    ["no variants", { variants: [] }, /single piece/],
  ])("rejects %s → 400, runs no SQL", async (_name, extra, message) => {
    const res = await items.POST(req("POST", "/api/items", { body: oneOff(extra) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(calls).toHaveLength(0);
  });
});

describe("GET /api/items/[id]", () => {
  beforeEach(() => reset(null));
  const get = () => item.GET(req("GET", `/api/items/${ID}`), ctx(ID));
  const withItem = () => {
    results.push({
      match: "FROM items i",
      rows: [
        {
          id: ID, title: "x", costPrice: 1200, sellingPrice: 1999, isOneOfAKind: false, status: "active",
          version: "2026-10-18 06:12:00.123456+00",
          createdBy: { id: OWNER.id, name: "Owner" }, updatedBy: { id: SELLER.id, name: "Seller" },
        },
      ],
    });
    results.push({ match: "FROM variants v", rows: [{ id: "v1", size: "M", quantity: 2, sellingPriceOverride: 1799, costPriceOverride: 900 }] });
  };

  it("without a session → 401, runs no SQL", async () => {
    expect((await get()).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("malformed id → 400, unknown → 404", async () => {
    reset(OWNER);
    expect((await item.GET(req("GET", "/api/items/nope"), ctx("nope"))).status).toBe(400);
    expect((await get()).status).toBe(404);
  });

  it("as a seller: no cost anywhere — not the item's, not a variant's", async () => {
    reset(SELLER);
    withItem();
    const json = await (await get()).json();
    expect(json.data).not.toHaveProperty("costPrice");
    expect(json.data.variants[0]).not.toHaveProperty("costPriceOverride");
    expect(json.data.variants[0].sellingPriceOverride).toBe(1799);
    expect(JSON.stringify(json)).not.toMatch(/cost/i);
    expect(json.data.sellingPrice).toBe(1999);
  });

  it("as the owner: item and variant cost included", async () => {
    reset(OWNER);
    withItem();
    const json = await (await get()).json();
    expect(json.data.costPrice).toBe(1200);
    expect(json.data.variants[0].costPriceOverride).toBe(900);
  });

  it("returns the concurrency version (exact text) and who added / last changed it", async () => {
    reset(SELLER);
    withItem();
    const { data } = await (await get()).json();
    expect(data.version).toBe("2026-10-18 06:12:00.123456+00");
    expect(data.createdBy).toEqual({ id: OWNER.id, name: "Owner" });
    expect(data.updatedBy).toEqual({ id: SELLER.id, name: "Seller" });
    expect(sqlLike("FROM items i")[0][0]).toContain('i.updated_at::text AS "version"');
  });

  it("only live variants and photos", async () => {
    reset(OWNER);
    withItem();
    await get();
    expect(sqlLike("FROM variants v")[0][0]).toContain("v.deleted_at IS NULL");
    expect(sqlLike("FROM images")[0][0]).toContain("deleted_at IS NULL");
  });
});

describe("GET /api/items (inventory list)", () => {
  beforeEach(() => reset(null));
  const list = (qs = "") => items.GET(req("GET", `/api/items${qs}`));
  const listSql = () => sqlLike("FROM items i")[0];
  const row = (n: number, extra: object = {}) => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    title: `Item ${n}`,
    status: "active",
    itemTypeName: "Saree",
    sellingPrice: 1999,
    fromPrice: null,
    coverUrl: null,
    coverAlt: null,
    totalStock: 5,
    variantCount: 1,
    isOneOfAKind: false,
    cursorAt: "2026-10-18 06:12:00.123456+00",
    ...extra,
  });
  const rows = (count: number) => Array.from({ length: count }, (_, i) => row(i + 1));

  it("without a session → 401, runs no SQL", async () => {
    expect((await list()).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("as a seller: 200 with items and no next page when 20 or fewer", async () => {
    reset(SELLER);
    results.push({ match: "FROM items i", rows: rows(20) });
    const res = await list();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.items).toHaveLength(20);
    expect(json.data.nextCursor).toBeNull();
  });

  it("never selects or returns a cost price, even for the owner", async () => {
    reset(OWNER);
    // Even if the database handed back cost fields, the response must not carry them.
    results.push({ match: "FROM items i", rows: [row(1, { costPrice: 1200, cost_price: 1200 })] });
    const json = await (await list()).json();
    expect(listSql()[0]).not.toMatch(/cost_price/);
    expect(json.data.items[0]).not.toHaveProperty("costPrice");
    expect(json.data.items[0]).not.toHaveProperty("cost_price");
    expect(json.data.items[0]).not.toHaveProperty("cursorAt");
  });

  it("is read-only: one SELECT, no writes", async () => {
    reset(OWNER);
    await list("?q=lav");
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
  });

  it("shows active, draft and sold-out items only (archived and deleted hidden)", async () => {
    reset(OWNER);
    await list();
    const [sql, params] = listSql();
    expect(sql).toContain("i.deleted_at IS NULL");
    expect(sql).toContain("i.status = ANY($1::text[])");
    expect(params![0]).toEqual(["active", "draft", "sold_out"]);
  });

  it("orders newest first with id as the tie-break and asks for one extra row", async () => {
    reset(OWNER);
    await list();
    const [sql, params] = listSql();
    expect(sql).toContain("ORDER BY i.created_at DESC, i.id DESC");
    expect(params![params!.length - 1]).toBe(21);
  });

  it("search: word prefixes on the exact index expression; symbols cannot break the query", async () => {
    reset(OWNER);
    await list(`?q=${encodeURIComponent(" Lav)( geo:*! ")}`);
    const [sql, params] = listSql();
    expect(sql).toContain("to_tsvector('simple', i.title) @@ to_tsquery('simple', $2)");
    expect(params![1]).toBe("lav:* & geo:*");
  });

  it("search with nothing searchable left lists everything", async () => {
    reset(OWNER);
    await list(`?q=${encodeURIComponent("&&!!")}`);
    expect(listSql()[0]).not.toContain("to_tsquery");
  });

  it("search over 100 characters → 400, runs no SQL", async () => {
    reset(OWNER);
    const res = await list(`?q=${"a".repeat(101)}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too long/);
    expect(calls).toHaveLength(0);
  });

  it.each(["not-a-cursor!", "aGVsbG8", Buffer.from("2026-10-18 06:12:00+00|nope").toString("base64url")])(
    "bad cursor %s → 400, runs no SQL",
    async (cursor) => {
      reset(OWNER);
      expect((await list(`?cursor=${cursor}`)).status).toBe(400);
      expect(calls).toHaveLength(0);
    }
  );

  it("21 rows → first 20 plus a cursor; the cursor pages with a (created_at, id) row comparison", async () => {
    reset(OWNER);
    const page1 = rows(21);
    results.push({ match: "FROM items i", rows: page1 });
    const json = await (await list()).json();
    expect(json.data.items).toHaveLength(20);
    expect(json.data.nextCursor).toEqual(expect.any(String));

    reset(OWNER);
    await list(`?q=lav&cursor=${json.data.nextCursor}`);
    const [sql, params] = listSql();
    expect(sql).toContain("(i.created_at, i.id) < ($3::timestamptz, $4::uuid)");
    // The cursor is the 20th row (the last one shown), with microseconds intact.
    expect(params!.slice(2, 4)).toEqual(["2026-10-18 06:12:00.123456+00", page1[19].id]);
  });

  it("reads one-of-a-kind from the items column, not from variant values", async () => {
    reset(OWNER);
    await list();
    const [sql] = listSql();
    expect(sql).toContain('i.is_one_of_a_kind AS "isOneOfAKind"');
    expect(sql).not.toContain("One Size");
  });

  it("passes through the price, stock and one-of-a-kind fields the card needs", async () => {
    reset(SELLER);
    results.push({ match: "FROM items i", rows: [row(1, { fromPrice: 1799, totalStock: 0, variantCount: 0, isOneOfAKind: null })] });
    const item = (await (await list()).json()).data.items[0];
    expect(item).toMatchObject({ sellingPrice: 1999, fromPrice: 1799, totalStock: 0, variantCount: 0, isOneOfAKind: false });
  });
});
