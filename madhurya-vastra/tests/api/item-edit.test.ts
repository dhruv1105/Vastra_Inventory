import { beforeEach, describe, expect, it, vi } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results, sqlLike } from "../helpers";
import * as item from "@/app/api/items/[id]/route";
import { STALE } from "@/lib/item-status";
import { COLOUR_FOR_PIECE, NO_TURN_ON, ONE_OF_A_KIND_LOCKED, PHOTO_GONE } from "@/lib/item-edit";
import { DUPLICATE_VARIANT } from "@/lib/variants";

// Photo files are written through fs; keep them off the disk here (the Postgres test writes real ones).
vi.mock("fs", () => {
  const fs = { existsSync: vi.fn(() => false), mkdirSync: vi.fn(), writeFileSync: vi.fn(), unlinkSync: vi.fn(), rmdirSync: vi.fn() };
  return { default: fs, ...fs };
});

const ID = "22222222-2222-2222-2222-222222222222";
const V = "2026-10-18 06:12:00.123456+00";
const RED = "c0000000-0000-4000-8000-000000000001";
const BLUE = "c0000000-0000-4000-8000-000000000002";
const O1 = "0c000000-0000-4000-8000-000000000001";
const O2 = "0c000000-0000-4000-8000-000000000002";
const P1 = "9e000000-0000-4000-8000-000000000001";
const P2 = "9e000000-0000-4000-8000-000000000002";
const PNG = "data:image/png;base64," + Buffer.from("not really a png").toString("base64");

type Variant = { id: string; size: string; colorId: string | null; colorName: string | null; quantity: number; sellingPriceOverride: number | null; costPriceOverride: number | null; displayOrder: number };
const stored = (opts: { fresh?: boolean; isOneOfAKind?: boolean; variants?: Variant[] } = {}) => {
  results.push({ match: "FOR UPDATE", rows: [{ fresh: opts.fresh ?? true }] });
  results.push({
    match: "FROM items i",
    rows: [{
      id: ID, title: "Lavender Saree", description: null, itemTypeId: null, wearType: "both", status: "active",
      isOneOfAKind: opts.isOneOfAKind ?? false, sellingPrice: 1999, costPrice: 1200, version: V,
    }],
  });
  results.push({ match: "FROM item_occasions io", rows: [{ id: O1, name: "Wedding" }] });
  results.push({
    match: "FROM variants v",
    rows: opts.variants ?? [
      { id: "v1", size: "M", colorId: RED, colorName: "Red", quantity: 2, sellingPriceOverride: null, costPriceOverride: 900, displayOrder: 0 },
      { id: "v2", size: "L", colorId: RED, colorName: "Red", quantity: 0, sellingPriceOverride: null, costPriceOverride: null, displayOrder: 1 },
    ],
  });
  results.push({
    match: "FROM images",
    rows: [
      { id: P1, cdnUrl: "/a.jpg", displayOrder: 0, altText: null },
      { id: P2, cdnUrl: "/b.jpg", displayOrder: 1, altText: "Back" },
    ],
  });
};

/** The edit form's save with nothing changed; `extra` overrides fields. */
const unchanged = (extra: object = {}) => ({
  version: V,
  title: "Lavender Saree",
  description: null,
  itemTypeId: null,
  wearType: "both",
  sellingPrice: 1999,
  costPrice: 1200,
  occasionIds: [O1],
  tagIds: [],
  isOneOfAKind: false,
  variants: [
    { size: "M", colorId: RED, quantity: 2, sellingPriceOverride: null, costPriceOverride: 900 },
    { size: "L", colorId: RED, quantity: 0, sellingPriceOverride: null, costPriceOverride: null },
  ],
  images: { keep: [{ id: P1, displayOrder: 0, altText: null }, { id: P2, displayOrder: 1, altText: "Back" }], add: [] },
  ...extra,
});
const patch = (body: unknown) => item.PATCH(req("PATCH", `/api/items/${ID}`, { body }), ctx(ID));
const writes = () => calls.filter(([sql]) => /^\s*(UPDATE|INSERT|DELETE)/.test(sql));
const itemUpdate = () => sqlLike("UPDATE items SET");
const logged = () => sqlLike("INSERT INTO activity_log").map(([, p]) => ({ actor: p![0], action: p![1], entity: p![3] }));

describe("PATCH /api/items/[id] — access and input", () => {
  beforeEach(() => reset(null));

  it("without a session → 401, runs no SQL", async () => {
    expect((await patch(unchanged())).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("from another site → 403", async () => {
    reset(OWNER);
    const res = await item.PATCH(req("PATCH", `/api/items/${ID}`, { body: unchanged(), origin: "https://evil.example" }), ctx(ID));
    expect(res.status).toBe(403);
  });

  it("malformed id → 400", async () => {
    reset(OWNER);
    expect((await item.PATCH(req("PATCH", "/api/items/nope", { body: unchanged() }), ctx("nope"))).status).toBe(400);
  });

  it.each([
    ["no version", { version: undefined }, /out of date/],
    ["a version that isn't one", { version: "yesterday" }, /out of date/],
    ["empty title", { title: "  " }, /Title is required/],
    ["price 0", { sellingPrice: 0 }, /greater than 0/],
    ["bad wear type", { wearType: "saree" }, /Wear type/],
    ["bad colour id", { variants: [{ size: "M", colorId: "red" }] }, /Invalid colour/],
    ["size too long", { variants: [{ size: "x".repeat(21), colorId: null }] }, /20 characters/],
    ["same size twice (case and spacing ignored)", { variants: [{ size: "M", colorId: RED }, { size: " m ", colorId: RED }] }, /only once/],
    ["bad occasion id", { occasionIds: ["wedding"] }, /occasion or tag/],
    ["images not in keep/add form", { images: [] }, /Invalid request body/],
    ["more than 8 photos", { images: { keep: [{ id: P1 }, { id: P2 }], add: Array(7).fill({ base64: PNG, mimeType: "image/png" }) } }, /maximum of 8/],
    ["a GIF", { images: { keep: [], add: [{ base64: PNG, mimeType: "image/gif" }] } }, /JPEG, PNG or WebP/],
    ["missing one-of-a-kind flag", { isOneOfAKind: undefined }, /one-of-a-kind/],
  ])("%s → 400, runs no SQL", async (_name, extra, message) => {
    reset(OWNER);
    const res = await patch(unchanged(extra));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(calls).toHaveLength(0);
  });

  it("duplicate size message is the shared one", async () => {
    reset(OWNER);
    const res = await patch(unchanged({ variants: [{ size: "XL", colorId: null }, { size: "xl", colorId: null }] }));
    expect((await res.json()).error).toBe(DUPLICATE_VARIANT);
  });

  it("unknown or deleted item → 404", async () => {
    reset(OWNER);
    expect((await patch(unchanged())).status).toBe(404);
  });
});

describe("PATCH /api/items/[id] — version check", () => {
  beforeEach(() => reset(OWNER));

  it("stale version (someone saved since) → 409 with the plain message, nothing written", async () => {
    stored({ fresh: false });
    const res = await patch(unchanged({ title: "New title" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(STALE);
    expect(writes()).toHaveLength(0);
    expect(sqlLike("ROLLBACK")).toHaveLength(1);
  });

  it("the version travels as the same string and is compared in SQL as timestamptz", async () => {
    stored();
    await patch(unchanged({ title: "New title" }));
    const [sql, params] = sqlLike("FOR UPDATE")[0];
    expect(sql).toContain("updated_at = $2::timestamptz");
    expect(params).toEqual([ID, V]);
  });
});

describe("PATCH /api/items/[id] — saving", () => {
  beforeEach(() => reset(OWNER));

  it("nothing changed → 200 with the item, no write, no history entry", async () => {
    stored();
    const res = await patch(unchanged());
    expect(res.status).toBe(200);
    expect((await res.json()).data.version).toBe(V);
    expect(writes()).toHaveLength(0);
    expect(sqlLike("COMMIT")).toHaveLength(0);
  });

  it("a changed title: item updated by this user, item.updated logged, committed", async () => {
    stored();
    const res = await patch(unchanged({ title: "  Lavender Georgette Saree " }));
    expect(res.status).toBe(200);
    const [sql, params] = itemUpdate()[0];
    expect(sql).toContain("updated_at = now(), updated_by = $9");
    expect(params).toEqual([ID, "Lavender Georgette Saree", null, null, "both", 1999, 1200, false, OWNER.id]);
    expect(logged()).toEqual([{ actor: OWNER.id, action: "item.updated", entity: ID }]);
    expect(sqlLike("COMMIT")).toHaveLength(1);
  });

  it("quantities sent are ignored: no quantity written, a new variant starts at 0", async () => {
    stored();
    const v = unchanged().variants.map((x) => ({ ...x, quantity: 99 }));
    await patch(unchanged({ variants: [...v, { size: "xl", colorId: BLUE, quantity: 7 }] }));
    expect(calls.some(([sql]) => /quantity\s*=/.test(sql) && sql.startsWith("UPDATE"))).toBe(false);
    const [sql, params] = sqlLike("INSERT INTO variants")[0];
    expect(sql).toContain("VALUES ($1, $2, $3, 0,");
    expect(params!.slice(0, 3)).toEqual([ID, "XL", BLUE]); // size normalised
    expect(params![5]).toBe(2); // after the existing display orders
  });

  it("removing a size with stock is refused, listing it; nothing written", async () => {
    stored();
    const res = await patch(unchanged({ variants: [unchanged().variants[1]] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/still have stock.*M × Red \(2 left\)/);
    expect(writes()).toHaveLength(0);
  });

  it("removing a size with no stock soft-deletes it (row kept)", async () => {
    stored();
    expect((await patch(unchanged({ variants: [unchanged().variants[0]] }))).status).toBe(200);
    const [sql, params] = sqlLike("UPDATE variants SET deleted_at")[0];
    expect(sql).toContain("deleted_at = now()");
    expect(params).toEqual(["v2", OWNER.id]);
    expect(sqlLike("DELETE FROM variants")).toHaveLength(0);
  });

  it("owner changes a variant's selling and cost override", async () => {
    stored();
    const [m, l] = unchanged().variants;
    await patch(unchanged({ variants: [{ ...m, sellingPriceOverride: 2199, costPriceOverride: 950 }, l] }));
    expect(sqlLike("UPDATE variants SET color_id")[0][1]).toEqual(["v1", RED, 2199, 950, OWNER.id]);
  });

  it("occasions and tags are replaced by difference", async () => {
    stored();
    await patch(unchanged({ occasionIds: [O2] }));
    expect(sqlLike("DELETE FROM item_occasions")[0][1]).toEqual([ID, [O1]]);
    expect(sqlLike("INSERT INTO item_occasions")[0][1]).toEqual([ID, O2, OWNER.id]);
    expect(writes().filter(([sql]) => sql.includes("item_tags"))).toHaveLength(0);
  });
});

describe("PATCH /api/items/[id] — a seller's save", () => {
  beforeEach(() => reset(SELLER));

  it("keeps the stored cost prices, whatever is sent; changes the selling price", async () => {
    stored();
    const [m, l] = unchanged().variants;
    const res = await patch(
      unchanged({ sellingPrice: 2099, costPrice: 1, variants: [{ ...m, costPriceOverride: 5 }, l, { size: "S", colorId: RED, costPriceOverride: 7 }] }),
    );
    expect(res.status).toBe(200);
    const params = itemUpdate()[0][1]!;
    expect(params[5]).toBe(2099);
    expect(params[6]).toBe(1200); // stored cost
    expect(sqlLike("UPDATE variants SET color_id")).toHaveLength(0); // only cost differed: no change
    expect(sqlLike("INSERT INTO variants")[0][1]![4]).toBeNull(); // new variant: no cost from a seller
    expect(JSON.stringify(await res.json())).not.toMatch(/cost/i);
  });

  it("can't see cost in the response even when nothing changed", async () => {
    stored();
    const json = await (await patch(unchanged({ costPrice: undefined }))).json();
    expect(JSON.stringify(json)).not.toMatch(/cost/i);
  });
});

describe("PATCH /api/items/[id] — one of a kind", () => {
  beforeEach(() => reset(OWNER));
  const piece: Variant = { id: "p1", size: "One Size", colorId: null, colorName: null, quantity: 1, sellingPriceOverride: null, costPriceOverride: null, displayOrder: 0 };
  const single = { size: "One Size", colorId: null };

  it("stays a single piece: adding sizes or colours is refused", async () => {
    stored({ isOneOfAKind: true, variants: [piece] });
    const res = await patch(unchanged({ isOneOfAKind: true, variants: [single, { size: "M", colorId: null }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(ONE_OF_A_KIND_LOCKED);
    expect(writes()).toHaveLength(0);
  });

  it("edits other fields of a one-of-a-kind item normally", async () => {
    stored({ isOneOfAKind: true, variants: [piece] });
    expect((await patch(unchanged({ isOneOfAKind: true, title: "Rani Pink", variants: [single] }))).status).toBe(200);
    expect(sqlLike("variants SET")).toHaveLength(0);
    expect(itemUpdate()[0][1]![7]).toBe(true);
  });

  it("turning it off without a colour → 400 asking for one", async () => {
    stored({ isOneOfAKind: true, variants: [piece] });
    const res = await patch(unchanged({ variants: [{ size: "One Size", colorId: RED }] }));
    expect((await res.json()).error).toBe(COLOUR_FOR_PIECE);
    expect(writes()).toHaveLength(0);
  });

  it("turning it off converts the piece to One Size × colour, same row and quantity", async () => {
    stored({ isOneOfAKind: true, variants: [piece] });
    const res = await patch(unchanged({ oneOfAKindColorId: RED, variants: [{ size: "One Size", colorId: RED, quantity: 0 }] }));
    expect(res.status).toBe(200);
    expect(sqlLike("UPDATE variants SET color_id")[0][1]).toEqual(["p1", RED, null, null, OWNER.id]);
    expect(sqlLike("INSERT INTO variants")).toHaveLength(0);
    expect(sqlLike("SET deleted_at")).toHaveLength(0);
    expect(itemUpdate()[0][1]![7]).toBe(false);
  });

  it("turning it off and adding sizes in the same save", async () => {
    stored({ isOneOfAKind: true, variants: [piece] });
    await patch(unchanged({ oneOfAKindColorId: RED, variants: [{ size: "One Size", colorId: RED }, { size: "M", colorId: RED }] }));
    expect(sqlLike("UPDATE variants SET color_id")).toHaveLength(1);
    expect(sqlLike("INSERT INTO variants")[0][1]!.slice(1, 3)).toEqual(["M", RED]);
  });

  it("an item can't be turned into one of a kind in edit", async () => {
    stored();
    const res = await patch(unchanged({ isOneOfAKind: true, variants: [single] }));
    expect((await res.json()).error).toBe(NO_TURN_ON);
    expect(writes()).toHaveLength(0);
  });
});

describe("PATCH /api/items/[id] — photos", () => {
  beforeEach(() => reset(OWNER));

  it("keep one (new place and description), add one, drop one", async () => {
    stored();
    const res = await patch(
      unchanged({
        images: { keep: [{ id: P2, displayOrder: 0, altText: " Back view " }], add: [{ base64: PNG, mimeType: "image/png", displayOrder: 1, altText: "Pallu" }] },
      }),
    );
    expect(res.status).toBe(200);
    expect(sqlLike("UPDATE images SET deleted_at")[0][1]).toEqual([[P1], OWNER.id]);
    expect(sqlLike("UPDATE images SET display_order")[0][1]).toEqual([P2, 0, "Back view", OWNER.id]);
    const [, ins] = sqlLike("INSERT INTO images")[0];
    expect(ins![0]).toBe(ID);
    expect(ins![1]).toMatch(new RegExp(`^/uploads/items/${ID}/[0-9a-f-]+\\.png$`));
    expect(ins!.slice(4, 6)).toEqual([1, "Pallu"]);
  });

  it("a photo id that isn't this item's live photo → 400, nothing written", async () => {
    stored();
    const res = await patch(unchanged({ images: { keep: [{ id: "9e000000-0000-4000-8000-000000000099" }], add: [] } }));
    expect((await res.json()).error).toBe(PHOTO_GONE);
    expect(writes()).toHaveLength(0);
  });
});
