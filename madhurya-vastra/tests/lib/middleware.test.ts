import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { SESSION_COOKIE_NAMES } from "@/lib/auth/cookie";

// The page gate only checks that a session cookie exists. Whether it is valid is decided on the
// server (tests/db/session-cookie.db.test.ts): a fake cookie passes this gate and still gets 401.

const visit = (path: string, cookie?: string) =>
  middleware(new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} }));
const redirectTo = (res: Response) => res.headers.get("location");
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";

describe("middleware (Edge page gate)", () => {
  it("no cookie → /login with the page to come back to", () => {
    const res = visit("/inventory?q=lav");
    expect(res.status).toBe(307);
    expect(redirectTo(res)).toBe("http://localhost:3000/login?next=%2Finventory%3Fq%3Dlav");
  });

  it("no cookie on / → /login without next", () => {
    expect(redirectTo(visit("/"))).toBe("http://localhost:3000/login");
  });

  it("no cookie on /login → shows the login page", () => {
    expect(passes(visit("/login"))).toBe(true);
  });

  it.each(SESSION_COOKIE_NAMES)("cookie %s present → page is served (validity is checked by the server)", (name) => {
    expect(passes(visit("/items/d5eed000-0000-4000-8000-000000000001", `${name}=anything`))).toBe(true);
  });

  it("a cookie on /login is let through: the login page checks the real session (no bounce loop)", () => {
    expect(passes(visit("/login", "mv.session_token=x"))).toBe(true);
    expect(passes(visit("/login/clear?next=%2Finventory", "mv.session_token=x"))).toBe(true);
  });

  it("other cookies (another app's better-auth, an empty value) don't count", () => {
    expect(visit("/inventory", "better-auth.session_token=x").status).toBe(307);
    expect(visit("/inventory", "mv.session_token=").status).toBe(307);
  });
});
