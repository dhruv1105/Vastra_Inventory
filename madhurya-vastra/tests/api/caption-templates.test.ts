import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, calls, ctx, req, reset, results, sqlLike } from "../helpers";
import * as col from "@/app/api/caption-templates/route";
import * as one from "@/app/api/caption-templates/[id]/route";
import * as share from "@/app/api/caption-templates/[id]/share/route";
import * as itemShare from "@/app/api/items/[id]/share/route";

const ID = "11111111-1111-1111-1111-111111111111";
const TPL = "22222222-2222-2222-2222-222222222222";
const row = { id: ID, kind: "caption", name: "New arrival", body: "{title}", defaultDetails: [], isDefault: false, updatedAt: "2026-11-05" };
const post = (body: unknown, origin?: string | null) => col.POST(req("POST", "/api/caption-templates", { body, origin }));
const patch = (body: unknown) => one.PATCH(req("PATCH", `/api/caption-templates/${ID}`, { body }), ctx(ID));
const logs = () => sqlLike("INSERT INTO activity_log");
const logPayload = () => JSON.parse(String(logs()[0][1]![4]));

describe("/api/caption-templates", () => {
  beforeEach(() => reset(null));

  it("no session → 401 for every method, no SQL", async () => {
    expect((await col.GET(req("GET", "/api/caption-templates"))).status).toBe(401);
    expect((await post({ kind: "caption", name: "A", body: "B" })).status).toBe(401);
    expect((await patch({ name: "A" })).status).toBe(401);
    expect((await one.DELETE(req("DELETE", `/api/caption-templates/${ID}`), ctx(ID))).status).toBe(401);
    expect((await share.POST(req("POST", `/api/caption-templates/${ID}/share`), ctx(ID))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("a seller can read, add, change and delete (owner's answer)", async () => {
    reset(SELLER);
    results.push({ match: "SELECT id, kind", rows: [row] }, { match: "INSERT INTO caption_templates", rows: [row] });
    results.push({ match: "SELECT kind FROM", rows: [{ kind: "caption" }] }, { match: "UPDATE caption_templates SET\n", rows: [row] });
    expect((await col.GET(req("GET", "/api/caption-templates"))).status).toBe(200);
    expect((await post({ kind: "caption", name: "New arrival", body: "{title}" })).status).toBe(201);
    expect((await patch({ name: "Fresh" })).status).toBe(200);
    results.push({ match: "SET deleted_at", rows: [{ id: ID, kind: "caption", name: "Fresh" }] });
    expect((await one.DELETE(req("DELETE", `/api/caption-templates/${ID}`), ctx(ID))).status).toBe(200);
  });

  it("POST from another site → 403, no SQL", async () => {
    reset(OWNER);
    expect((await post({ kind: "caption", name: "A", body: "B" }, "https://evil.example")).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("POST records the session user (not a body userId) and logs it", async () => {
    reset(OWNER);
    results.push({ match: "INSERT INTO caption_templates", rows: [row] });
    const res = await post({ kind: "caption", name: " New arrival ", body: "{title}", defaultDetails: ["price", "price"], userId: SELLER.id });
    expect(res.status).toBe(201);
    const insert = sqlLike("INSERT INTO caption_templates")[0][1]!;
    expect(insert).toEqual(["caption", "New arrival", "{title}", ["price"], false, OWNER.id]);
    expect(logs()).toHaveLength(1);
    expect(logs()[0][1]![1]).toBe("caption_template.created");
  });

  it.each([
    [{ kind: "story", name: "A", body: "B" }, "Choose caption or shop details"],
    [{ kind: "caption", name: " ", body: "B" }, "Name is required"],
    [{ kind: "caption", name: "x".repeat(51), body: "B" }, "Name must be 50 characters or less"],
    [{ kind: "caption", name: "A", body: "" }, "Text is required"],
    [{ kind: "caption", name: "A", body: "x".repeat(1001) }, "Text must be 1,000 characters or less"],
    [{ kind: "caption", name: "A", body: "{title} at {prise}" }, "{prise} is not a field. Only {title} can be filled in; tick details like price in the share sheet."],
    [{ kind: "shop_details", name: "A", body: "Call {title}" }, "Shop details can't contain fields like {title}. Write the text as it should appear."],
    [{ kind: "caption", name: "A", body: "B", defaultDetails: ["cost"] }, "Unknown item detail"],
    [{ kind: "shop_details", name: "A", body: "B", defaultDetails: ["price"] }, "Only captions can tick item details"],
    [{ kind: "caption", name: "A", body: "B", isDefault: "yes" }, "Invalid default flag"],
  ])("POST %j → 400 with a sentence", async (body, error) => {
    reset(OWNER);
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(sqlLike("INSERT")).toHaveLength(0);
  });

  it("POST as default clears the old default of the same kind first, in the same transaction", async () => {
    reset(OWNER);
    results.push({ match: "INSERT INTO caption_templates", rows: [{ ...row, isDefault: true }] });
    expect((await post({ kind: "shop_details", name: "Shop", body: "Madhurya Vastra", isDefault: true })).status).toBe(201);
    const order = calls.map(([s]) => s.trim().split(/\s+/).slice(0, 2).join(" "));
    expect(order).toEqual(["BEGIN", "UPDATE caption_templates", "INSERT INTO", "INSERT INTO", "COMMIT"]);
    expect(sqlLike("SET is_default = false")[0][1]).toEqual(["shop_details", OWNER.id, null]);
  });

  it("duplicate name → 409 with a sentence", async () => {
    reset(OWNER);
    const { pool } = await import("@/lib/db");
    const dup = Object.assign(new Error("dup"), { code: "23505" });
    (pool.connect as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      query: async (sql: string) => {
        if (sql.includes("INSERT INTO caption_templates")) throw dup;
        return { rows: [] };
      },
      release: () => {},
    });
    const res = await post({ kind: "caption", name: "New arrival", body: "Hi" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "A template with this name already exists" });
  });

  it("PATCH checks the text against the stored kind; a missing template → 404; kind can't change", async () => {
    reset(OWNER);
    results.push({ match: "SELECT kind FROM", rows: [{ kind: "shop_details" }] });
    expect(await (await patch({ body: "{title}" })).json()).toEqual({ error: "Shop details can't contain fields like {title}. Write the text as it should appear." });
    expect(sqlLike("UPDATE caption_templates")).toHaveLength(0);

    reset(OWNER);
    expect((await patch({ name: "X" })).status).toBe(404);
    expect((await patch({ kind: "caption" })).status).toBe(400);
    expect((await one.PATCH(req("PATCH", "/api/caption-templates/nope", { body: {} }), ctx("nope"))).status).toBe(404);
  });

  it("PATCH make default clears the other default (not this one) and logs what changed", async () => {
    reset(OWNER);
    results.push({ match: "SELECT kind FROM", rows: [{ kind: "caption" }] }, { match: "UPDATE caption_templates SET\n", rows: [row] });
    expect((await patch({ isDefault: true, defaultDetails: ["sizes"] })).status).toBe(200);
    expect(sqlLike("SET is_default = false")[0][1]).toEqual(["caption", OWNER.id, ID]);
    const update = sqlLike("UPDATE caption_templates SET\n")[0][1]!;
    expect(update).toEqual([ID, null, null, ["sizes"], true, OWNER.id]);
    expect(logPayload()).toEqual({ kind: "caption", name: "New arrival", changed: ["defaultDetails", "isDefault"] });
  });

  it("DELETE soft-deletes, drops the default flag and logs; missing → 404", async () => {
    reset(OWNER);
    expect((await one.DELETE(req("DELETE", `/api/caption-templates/${ID}`), ctx(ID))).status).toBe(404);
    expect(logs()).toHaveLength(0);
    results.push({ match: "SET deleted_at", rows: [{ id: ID, kind: "caption", name: "Old" }] });
    expect((await one.DELETE(req("DELETE", `/api/caption-templates/${ID}`), ctx(ID))).status).toBe(200);
    expect(sqlLike("SET deleted_at")[0][0]).toContain("is_default = false");
    expect(logs()[0][1]![1]).toBe("caption_template.deleted");
  });

  it("text share of a caption logs caption.shared with its name only", async () => {
    reset(SELLER);
    expect((await share.POST(req("POST", `/api/caption-templates/${ID}/share`), ctx(ID))).status).toBe(404);
    results.push({ match: "SELECT id, name FROM caption_templates", rows: [{ id: ID, name: "New collection" }] });
    expect((await share.POST(req("POST", `/api/caption-templates/${ID}/share`), ctx(ID))).status).toBe(200);
    expect(logs()[0][1]![1]).toBe("caption.shared");
    expect(logPayload()).toEqual({ template: "New collection" });
  });
});

describe("POST /api/items/[id]/share", () => {
  beforeEach(() => reset(null));
  const send = (body: unknown, id = ID, origin?: string | null) => itemShare.POST(req("POST", `/api/items/${id}/share`, { body, origin }), ctx(id));

  it("no session → 401; another site → 403; no SQL", async () => {
    expect((await send({ templateId: null, photos: 1 })).status).toBe(401);
    reset(SELLER);
    expect((await send({ templateId: null, photos: 1 }, ID, "https://evil.example")).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it.each([
    [{ templateId: "nope", photos: 1 }, "Invalid template"],
    [{ templateId: null, photos: 9 }, "Photos must be a whole number from 0 to 8"],
    [{ templateId: null, photos: 1.5 }, "Photos must be a whole number from 0 to 8"],
    [{ templateId: null }, "Photos must be a whole number from 0 to 8"],
  ])("%j → 400", async (body, error) => {
    reset(SELLER);
    const res = await send(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
  });

  it("missing item → 404", async () => {
    reset(SELLER);
    expect((await send({ templateId: null, photos: 0 })).status).toBe(404);
  });

  it.each([
    ["sold_out", "Sold out — only items in stock can be shared."],
    ["draft", "This is a draft. Publish it before sharing."],
    ["archived", "Archived — restore it before sharing."],
  ])("%s item → 409 with the reason, nothing logged", async (status, error) => {
    reset(SELLER);
    results.push({ match: "SELECT i.status", rows: [{ status, template: null }] });
    const res = await send({ templateId: null, photos: 1 });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error });
    expect(logs()).toHaveLength(0);
  });

  it("active item → logs item.shared with the template's name (looked up on the server) and photo count", async () => {
    reset(SELLER);
    results.push({ match: "SELECT i.status", rows: [{ status: "active", template: "New arrival" }] });
    expect((await send({ templateId: TPL, photos: 3, caption: "secret text" })).status).toBe(200);
    expect(sqlLike("SELECT i.status")[0][1]).toEqual([ID, TPL]);
    const log = logs()[0][1]!;
    expect(log.slice(0, 4)).toEqual([SELLER.id, "item.shared", "item", ID]);
    expect(logPayload()).toEqual({ template: "New arrival", photos: 3 });
    expect(String(log[4])).not.toContain("secret");
  });
});
