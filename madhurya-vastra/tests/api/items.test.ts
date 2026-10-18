import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results } from "../helpers";
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

describe("GET /api/items/[id]", () => {
  beforeEach(() => {
    reset(null);
  });
  const withItem = () => results.push({ match: "FROM items i", rows: [{ id: ID, title: "x", costPrice: 1200, sellingPrice: 1999 }] });

  it("without a session → 401", async () => {
    expect((await item.GET(req("GET", `/api/items/${ID}`), ctx(ID))).status).toBe(401);
  });

  it("as a seller: no cost price in the response", async () => {
    reset(SELLER);
    withItem();
    const json = await (await item.GET(req("GET", `/api/items/${ID}`), ctx(ID))).json();
    expect(json.data).not.toHaveProperty("costPrice");
    expect(json.data.sellingPrice).toBe(1999);
  });

  it("as the owner: cost price included", async () => {
    reset(OWNER);
    withItem();
    const json = await (await item.GET(req("GET", `/api/items/${ID}`), ctx(ID))).json();
    expect(json.data.costPrice).toBe(1200);
  });
});
