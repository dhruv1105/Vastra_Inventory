import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results, sqlLike } from "../helpers";
import * as types from "@/app/api/lookups/item-types/route";
import * as typeItem from "@/app/api/lookups/item-types/[id]/route";
import * as colors from "@/app/api/lookups/colors/route";
import * as colorItem from "@/app/api/lookups/colors/[id]/route";
import * as occasions from "@/app/api/lookups/occasions/route";
import * as occasionItem from "@/app/api/lookups/occasions/[id]/route";
import * as tags from "@/app/api/lookups/tags/route";
import * as tagItem from "@/app/api/lookups/tags/[id]/route";

const ID = "11111111-1111-1111-1111-111111111111";
const LISTS = [
  { name: "item-types", col: types, item: typeItem, sellerCanAdd: true },
  { name: "colors", col: colors, item: colorItem, sellerCanAdd: false },
  { name: "occasions", col: occasions, item: occasionItem, sellerCanAdd: false },
  { name: "tags", col: tags, item: tagItem, sellerCanAdd: false },
];

describe.each(LISTS)("/api/lookups/$name", ({ name, col, item, sellerCanAdd }) => {
  beforeEach(() => reset(null));

  it("GET without a session → 401, runs no SQL", async () => {
    const res = await col.GET(req("GET", `/api/lookups/${name}`));
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("GET as a seller → 200", async () => {
    reset(SELLER);
    expect((await col.GET(req("GET", `/api/lookups/${name}`))).status).toBe(200);
  });

  it(`POST as a seller → ${sellerCanAdd ? "201" : "403"}`, async () => {
    reset(SELLER);
    results.push({ match: "INSERT INTO", rows: [{ id: ID, name: "Anarkali" }] });
    const res = await col.POST(req("POST", `/api/lookups/${name}`, { body: { name: "Anarkali" } }));
    expect(res.status).toBe(sellerCanAdd ? 201 : 403);
  });

  it("POST records the session user, not a userId from the body, and logs it", async () => {
    reset(OWNER);
    results.push({ match: "INSERT INTO " + name.replace("-", "_"), rows: [{ id: ID, name: "Silk" }] });
    const res = await col.POST(req("POST", `/api/lookups/${name}`, { body: { name: "Silk", userId: SELLER.id } }));
    expect(res.status).toBe(201);
    const insert = calls.find(([sql]) => sql.includes(`INSERT INTO ${name.replace("-", "_")}`))!;
    expect(insert[1]).toContain(OWNER.id);
    expect(insert[1]).not.toContain(SELLER.id);
    expect(sqlLike("INSERT INTO activity_log")).toHaveLength(1);
  });

  it("POST from another site → 403, runs no SQL", async () => {
    reset(OWNER);
    const res = await col.POST(req("POST", `/api/lookups/${name}`, { body: { name: "X" }, origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("POST without an Origin header → 403", async () => {
    reset(OWNER);
    expect((await col.POST(req("POST", `/api/lookups/${name}`, { body: { name: "X" }, origin: null }))).status).toBe(403);
  });

  it("PATCH and DELETE as a seller → 403", async () => {
    reset(SELLER);
    expect((await item.PATCH(req("PATCH", `/api/lookups/${name}/${ID}`, { body: { name: "Y" } }), ctx(ID))).status).toBe(403);
    expect((await item.DELETE(req("DELETE", `/api/lookups/${name}/${ID}`), ctx(ID))).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("PATCH and DELETE without a session → 401", async () => {
    expect((await item.PATCH(req("PATCH", `/api/lookups/${name}/${ID}`, { body: { name: "Y" } }), ctx(ID))).status).toBe(401);
    expect((await item.DELETE(req("DELETE", `/api/lookups/${name}/${ID}`), ctx(ID))).status).toBe(401);
  });

  it("DELETE a malformed or missing id → 404 (not a 500)", async () => {
    reset(OWNER);
    expect((await item.DELETE(req("DELETE", `/api/lookups/${name}/not-a-uuid`), ctx("not-a-uuid"))).status).toBe(404);
    expect((await item.DELETE(req("DELETE", `/api/lookups/${name}/${ID}`), ctx(ID))).status).toBe(404);
  });

  it("a turned-off account → 403", async () => {
    reset({ ...OWNER, banned: true });
    expect((await col.GET(req("GET", `/api/lookups/${name}`))).status).toBe(403);
  });
});
