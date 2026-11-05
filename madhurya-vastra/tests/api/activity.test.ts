import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results } from "../helpers";
import * as activity from "@/app/api/items/[id]/activity/route";

const ID = "22222222-2222-2222-2222-222222222222";
const get = (id = ID) => activity.GET(req("GET", `/api/items/${id}/activity`), ctx(id));
const entry = {
  id: "a1", action: "item.updated", entityType: "item", entityId: ID, createdAt: "2026-10-18T06:12:00Z",
  actor: { id: OWNER.id, name: "Owner" },
  payload: {
    before: { sellingPrice: 1999, costPrice: 1200 },
    after: { sellingPrice: 2199, costPrice: 1300 },
    variants: { changed: [{ size: "M", sellingPriceOverride: { before: null, after: 1799 }, costPriceOverride: { before: null, after: 900 } }] },
  },
};

describe("GET /api/items/[id]/activity", () => {
  beforeEach(() => reset(null));

  it("without a session → 401, runs no SQL", async () => {
    expect((await get()).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("malformed id → 400", async () => {
    reset(OWNER);
    expect((await get("nope")).status).toBe(400);
  });

  it("seller: selling price changes visible, every cost change removed", async () => {
    reset(SELLER);
    results.push({ match: "FROM activity_log", rows: [entry] });
    const { data } = await (await get()).json();
    expect(data[0].payload.before).toEqual({ sellingPrice: 1999 });
    expect(data[0].payload.after).toEqual({ sellingPrice: 2199 });
    expect(data[0].payload.variants.changed[0]).toEqual({ size: "M", sellingPriceOverride: { before: null, after: 1799 } });
    expect(JSON.stringify(data)).not.toMatch(/cost/i);
  });

  it("owner: the full before/after, cost included", async () => {
    reset(OWNER);
    results.push({ match: "FROM activity_log", rows: [entry] });
    const { data } = await (await get()).json();
    expect(data[0].payload.after.costPrice).toBe(1300);
    expect(data[0].actor).toEqual({ id: OWNER.id, name: "Owner" });
  });

  it("only this item's entries, newest first, bounded", async () => {
    reset(OWNER);
    await get();
    const [sql, params] = calls[0];
    expect(sql).toContain("ORDER BY a.created_at DESC");
    expect(params).toEqual(["item", ID, 20]);
  });
});
