import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results, sqlLike } from "../helpers";
import * as publish from "@/app/api/items/[id]/publish/route";
import * as archive from "@/app/api/items/[id]/archive/route";
import * as restore from "@/app/api/items/[id]/restore/route";
import * as item from "@/app/api/items/[id]/route";
import { STALE } from "@/lib/item-status";

const ID = "22222222-2222-2222-2222-222222222222";
const V = "2026-10-18 06:12:00.123456+00";
const V2 = "2026-10-18 06:13:00.654321+00";
type Handler = (r: Request, c: { params: { id: string } }) => Promise<Response>;
const NO_BODY = Symbol("no body");
const call = (h: Handler, path: string, method = "POST", body: unknown = { version: V }) =>
  h(req(method, `/api/items/${ID}/${path}`, { body: body === NO_BODY ? undefined : body }), ctx(ID));
const current = (status: string, opts: { fresh?: boolean; totalStock?: number } = {}) => {
  results.push({ match: "FOR UPDATE", rows: [{ status, fresh: opts.fresh ?? true, totalStock: opts.totalStock ?? 0 }] });
  results.push({ match: "UPDATE items SET", rows: [{ version: V2 }] });
};
const updates = () => sqlLike("UPDATE items SET");
const logged = () => sqlLike("INSERT INTO activity_log").map(([, p]) => ({ actor: p![0], action: p![1], entity: p![3], payload: JSON.parse(p![4] as string) }));

describe("item status actions — common rules", () => {
  beforeEach(() => reset(null));

  it("without a session → 401, runs no SQL", async () => {
    expect((await call(publish.POST, "publish")).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("from another site → 403", async () => {
    reset(OWNER);
    expect((await publish.POST(req("POST", `/api/items/${ID}/publish`, { body: { version: V }, origin: "https://evil.example" }), ctx(ID))).status).toBe(403);
  });

  it.each([NO_BODY, {}, { version: "yesterday" }, { version: 123 }])("missing or malformed version %s → 400, runs no SQL", async (body) => {
    reset(OWNER);
    const res = await call(publish.POST, "publish", "POST", body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/out of date/);
    expect(calls).toHaveLength(0);
  });

  it("stale version (someone saved since) → 409 with the plain message, nothing changed", async () => {
    reset(OWNER);
    current("draft", { fresh: false });
    const res = await call(publish.POST, "publish");
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(STALE);
    expect(updates()).toHaveLength(0);
    expect(logged()).toHaveLength(0);
  });

  it("the version is compared in SQL as timestamptz (never via a JS Date)", async () => {
    reset(OWNER);
    current("draft");
    await call(publish.POST, "publish");
    const [sql, params] = sqlLike("FOR UPDATE")[0];
    expect(sql).toContain("i.updated_at = $2::timestamptz");
    expect(params).toEqual([ID, V]);
  });

  it("unknown or deleted item → 404", async () => {
    reset(OWNER);
    expect((await call(publish.POST, "publish")).status).toBe(404);
  });
});

describe("POST /api/items/[id]/publish (owner and sellers)", () => {
  beforeEach(() => reset(SELLER));

  it("seller publishes a draft: active, new version, who did it, logged", async () => {
    current("draft");
    const res = await call(publish.POST, "publish");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ id: ID, status: "active", version: V2 });
    expect(updates()[0][1]).toEqual([ID, SELLER.id, "active"]);
    expect(logged()).toEqual([{ actor: SELLER.id, action: "item.published", entity: ID, payload: { before: { status: "draft" }, after: { status: "active" } } }]);
  });

  it("not a draft → 400", async () => {
    current("active");
    const res = await call(publish.POST, "publish");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Only drafts/);
  });
});

describe("POST /api/items/[id]/archive (owner only)", () => {
  beforeEach(() => reset(OWNER));

  it("seller → 403, runs no SQL", async () => {
    reset(SELLER);
    expect((await call(archive.POST, "archive")).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it.each(["active", "sold_out", "draft"])("owner archives a %s item", async (status) => {
    current(status);
    const res = await call(archive.POST, "archive");
    expect((await res.json()).data.status).toBe("archived");
    expect(logged()[0]).toMatchObject({ action: "item.archived", payload: { before: { status }, after: { status: "archived" } } });
  });

  it("already archived → 400", async () => {
    current("archived");
    expect((await call(archive.POST, "archive")).status).toBe(400);
  });
});

describe("POST /api/items/[id]/restore (owner only)", () => {
  beforeEach(() => reset(OWNER));

  it("seller → 403, runs no SQL", async () => {
    reset(SELLER);
    expect((await call(restore.POST, "restore")).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("stock left → active", async () => {
    current("archived", { totalStock: 3 });
    expect((await (await call(restore.POST, "restore")).json()).data.status).toBe("active");
    expect(logged()[0]).toMatchObject({ action: "item.restored", payload: { before: { status: "archived" }, after: { status: "active" } } });
  });

  it("no live stock → sold out", async () => {
    current("archived", { totalStock: 0 });
    expect((await (await call(restore.POST, "restore")).json()).data.status).toBe("sold_out");
  });

  it("counts live variants only, and the item row is locked", async () => {
    current("archived", { totalStock: 1 });
    await call(restore.POST, "restore");
    const sql = sqlLike("FOR UPDATE")[0][0];
    expect(sql).toContain("v.deleted_at IS NULL");
    expect(sql).toContain("FOR UPDATE OF i");
  });

  it("not archived → 400", async () => {
    current("active");
    expect((await call(restore.POST, "restore")).status).toBe(400);
  });
});

describe("DELETE /api/items/[id] (owner only, drafts only)", () => {
  beforeEach(() => reset(OWNER));
  const del = (body: unknown = { version: V }) => item.DELETE(req("DELETE", `/api/items/${ID}`, { body }), ctx(ID));

  it("seller → 403, runs no SQL", async () => {
    reset(SELLER);
    expect((await del()).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("draft → soft delete (deleted_at), logged", async () => {
    current("draft");
    const res = await del();
    expect((await res.json()).data).toEqual({ id: ID, deleted: true });
    expect(updates()[0][0]).toContain("SET deleted_at = now()");
    expect(logged()[0]).toMatchObject({ action: "item.deleted", payload: { before: { status: "draft" }, after: { deleted: true } } });
  });

  it.each(["active", "sold_out", "archived"])("%s → 400: archive instead", async (status) => {
    current(status);
    const res = await del();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Archive this item instead/);
    expect(updates()).toHaveLength(0);
  });
});
