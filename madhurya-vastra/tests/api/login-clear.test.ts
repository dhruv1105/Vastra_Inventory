import { beforeEach, describe, expect, it } from "vitest";
import { OWNER, req, reset, state } from "../helpers";
import * as clear from "@/app/(auth)/login/clear/route";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookie";

const go = (qs = "") => clear.GET(req("GET", `/login/clear${qs}`));
const cleared = (res: Response) =>
  (res.headers.getSetCookie?.() ?? []).filter((c) => /Max-Age=0/i.test(c)).map((c) => c.split("=")[0]);

describe("GET /login/clear", () => {
  beforeEach(() => reset(null));

  it("session not valid: removes every auth cookie and shows the form with the same ?next", async () => {
    const res = await go("?next=%2Fitems%2Fabc");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fitems%2Fabc");
    expect(cleared(res).sort()).toEqual([...AUTH_COOKIE_NAMES].sort());
  });

  it("no ?next → plain /login", async () => {
    expect((await go()).headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("unsafe ?next is not followed", async () => {
    expect((await go("?next=%2F%2Fevil.example")).headers.get("location")).toBe("http://localhost:3000/login?next=%2Finventory");
  });

  it("session still valid: a link here can't sign anyone out — sent on to ?next, cookies untouched", async () => {
    reset(OWNER);
    const res = await go("?next=%2Finventory%3Fq%3Dlav");
    expect(res.headers.get("location")).toBe("http://localhost:3000/inventory?q=lav");
    expect(cleared(res)).toEqual([]);
  });

  it("turned-off account counts as not valid: cookies cleared", async () => {
    reset({ ...OWNER, banned: true });
    expect(state.user?.banned).toBe(true);
    expect(cleared(await go())).toHaveLength(AUTH_COOKIE_NAMES.length);
  });
});
