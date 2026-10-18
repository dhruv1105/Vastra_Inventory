import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, SELLER, authApi, ctx, req, reset, results, sqlLike } from "../helpers";
import * as staff from "@/app/api/staff/route";
import * as member from "@/app/api/staff/[id]/route";
import * as password from "@/app/api/account/password/route";
import * as colors from "@/app/api/lookups/colors/route";

const OTHER = "44444444-4444-4444-4444-444444444444";
const row = (o: object) => ({ id: OTHER, name: "Asha", phone: "+919812345678", email: "staff-x@staff.madhurya.invalid", role: "seller", disabled: false, mustChangePassword: false, createdAt: "2026-10-18", ...o });
const patch = (id: string, body: object) => member.PATCH(req("PATCH", `/api/staff/${id}`, { body }), ctx(id));

describe("/api/staff", () => {
  beforeEach(() => reset(null));

  it("GET: 401 signed out, 403 seller, 200 owner (placeholder emails hidden)", async () => {
    expect((await staff.GET(req("GET", "/api/staff"))).status).toBe(401);
    reset(SELLER);
    expect((await staff.GET(req("GET", "/api/staff"))).status).toBe(403);
    reset(OWNER);
    results.push({ match: "FROM users", rows: [row({})] });
    const json = await (await staff.GET(req("GET", "/api/staff"))).json();
    expect(json.data[0].email).toBeNull();
  });

  it("POST as a seller → 403, nobody created", async () => {
    reset(SELLER);
    expect((await staff.POST(req("POST", "/api/staff", { body: { name: "X", phone: "9812345678" } }))).status).toBe(403);
    expect(authApi.createUser).not.toHaveBeenCalled();
  });

  it("POST rejects a bad phone number", async () => {
    reset(OWNER);
    const res = await staff.POST(req("POST", "/api/staff", { body: { name: "X", phone: "12345" } }));
    expect(res.status).toBe(400);
    expect(authApi.createUser).not.toHaveBeenCalled();
  });

  it("POST creates a seller with a normalised phone, a hidden email and a one-time password", async () => {
    reset(OWNER);
    results.push({ match: "WHERE id = $1", rows: [row({ id: "33333333-3333-3333-3333-333333333333", mustChangePassword: true })] });
    const res = await staff.POST(req("POST", "/api/staff", { body: { name: "Asha", phone: "98123 45678" } }));
    expect(res.status).toBe(201);
    const arg = authApi.createUser.mock.calls[0][0] as unknown as { body: { role: string; email: string; data: { phoneNumber: string }; password: string } };
    expect(arg.body.role).toBe("seller");
    expect(arg.body.data.phoneNumber).toBe("+919812345678");
    expect(arg.body.email).toMatch(/@staff\.madhurya\.invalid$/);
    const json = await res.json();
    expect(json.data.temporaryPassword).toBe(arg.body.password);
    expect(sqlLike("must_change_password = $2")).toHaveLength(1);
    expect(sqlLike("INSERT INTO activity_log")).toHaveLength(1);
  });
});

describe("/api/staff/[id]", () => {
  beforeEach(() => reset(null));

  it("seller → 403; signed out → 401; bad id → 404", async () => {
    expect((await patch(OTHER, { action: "disable" })).status).toBe(401);
    reset(SELLER);
    expect((await patch(OTHER, { action: "disable" })).status).toBe(403);
    reset(OWNER);
    expect((await patch("nope", { action: "disable" })).status).toBe(404);
  });

  it("the owner can't turn off or demote themselves", async () => {
    reset(OWNER);
    results.push({ match: "WHERE id = $1", rows: [row({ id: OWNER.id, role: "owner" })] });
    expect((await patch(OWNER.id, { action: "disable" })).status).toBe(409);
    expect((await patch(OWNER.id, { action: "set-role", role: "seller" })).status).toBe(409);
    expect(authApi.banUser).not.toHaveBeenCalled();
    expect(authApi.setRole).not.toHaveBeenCalled();
  });

  it("the last active owner can't be demoted", async () => {
    reset(OWNER);
    results.push({ match: "WHERE id = $1", rows: [row({ role: "owner" })] });
    results.push({ match: "count(*)::int AS n", rows: [{ n: 0 }] });
    expect((await patch(OTHER, { action: "set-role", role: "seller" })).status).toBe(409);
  });

  it("reset password: new temporary password, must change, signed out everywhere", async () => {
    reset(OWNER);
    results.push({ match: "WHERE id = $1", rows: [row({})] });
    const json = await (await patch(OTHER, { action: "reset-password" })).json();
    expect(json.data.temporaryPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(authApi.setUserPassword).toHaveBeenCalledOnce();
    expect(authApi.revokeUserSessions).toHaveBeenCalledOnce();
    expect(sqlLike("must_change_password = $2")).toHaveLength(1);
  });

  it("turn off a seller → banUser + audit", async () => {
    reset(OWNER);
    results.push({ match: "WHERE id = $1", rows: [row({})] });
    expect((await patch(OTHER, { action: "disable" })).status).toBe(200);
    expect(authApi.banUser).toHaveBeenCalledOnce();
    expect(sqlLike("INSERT INTO activity_log")).toHaveLength(1);
  });

  it("unknown action → 400", async () => {
    reset(OWNER);
    results.push({ match: "WHERE id = $1", rows: [row({})] });
    expect((await patch(OTHER, { action: "delete" })).status).toBe(400);
  });
});

describe("new password pending", () => {
  beforeEach(() => reset({ ...SELLER, mustChangePassword: true }));

  it("other routes refuse until a new password is chosen", async () => {
    const res = await colors.GET(req("GET", "/api/lookups/colors"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Choose a new password first.");
  });

  it("POST /api/account/password works and clears the flag", async () => {
    const res = await password.POST(req("POST", "/api/account/password", { body: { currentPassword: "abcd-efgh-jkmn", newPassword: "my new shop password" } }));
    expect(res.status).toBe(200);
    expect(authApi.changePassword).toHaveBeenCalledOnce();
    expect(sqlLike("must_change_password = $2")[0][1]).toEqual([SELLER.id, false]);
  });

  it("rejects a short new password without calling better-auth", async () => {
    const res = await password.POST(req("POST", "/api/account/password", { body: { currentPassword: "x", newPassword: "short" } }));
    expect(res.status).toBe(400);
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("signed out → 401", async () => {
    reset(null);
    expect((await password.POST(req("POST", "/api/account/password", { body: {} }))).status).toBe(401);
  });
});
