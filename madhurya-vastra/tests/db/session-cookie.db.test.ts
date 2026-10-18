import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// The Edge middleware only checks that a session cookie EXISTS (tests/lib/middleware.test.ts).
// This proves the real check happens on the server: with the real better-auth and Postgres (no
// fakes), a made-up, tampered, expired or deleted session cookie gets 401 from the API.
//   TEST_DATABASE_URL=postgres://… npm run test:db      (plain `npm test` skips it)

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) {
  process.env.DATABASE_URL = URL_; // lib/db and lib/auth read these when first imported
  process.env.BETTER_AUTH_SECRET ||= "test-only-secret-0123456789abcdef0123456789";
  process.env.BETTER_AUTH_URL ||= "http://localhost:3000";
}

describe.skipIf(!URL_)("session cookie checked on the server (Postgres)", () => {
  const client = new pg.Client({ connectionString: URL_ });
  const userId = randomUUID();
  const email = `cookie-test-${userId.slice(0, 8)}@example.invalid`;
  const password = "cookie-test-password";
  let GET: (r: Request) => Promise<Response>;
  let endPool: () => Promise<void>;
  let cookie = ""; // "mv.session_token=<token>.<signature>"

  const list = (cookieHeader?: string) =>
    GET(new Request("http://localhost:3000/api/items", { headers: { host: "localhost:3000", ...(cookieHeader ? { cookie: cookieHeader } : {}) } }));

  beforeAll(async () => {
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    const { hashPassword } = await import("@/lib/auth/password.mjs");
    await client.query(`INSERT INTO users (id, name, email, role) VALUES ($1, 'Cookie Test', $2, 'owner')`, [userId, email]);
    await client.query(`INSERT INTO accounts (user_id, account_id, provider_id, password) VALUES ($1, $2, 'credential', $3)`, [
      userId,
      userId,
      await hashPassword(password),
    ]);

    // A real sign-in, exactly as the login screen does it, to get a genuine signed cookie.
    const { auth } = await import("@/lib/auth/server");
    const res = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    const m = /((?:__Secure-)?mv\.session_token)=([^;]+)/.exec(setCookie);
    expect(m, "sign-in should set the mv.session_token cookie").not.toBeNull();
    cookie = `${m![1]}=${m![2]}`;

    ({ GET } = await import("@/app/api/items/route"));
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM accounts WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.end();
    await endPool?.();
  });

  it("a genuine session cookie reaches the data (200)", async () => {
    expect((await list(cookie)).status).toBe(200);
  });

  it("no cookie → 401", async () => {
    expect((await list()).status).toBe(401);
  });

  it("a made-up cookie (passes the Edge gate) → 401", async () => {
    expect((await list("mv.session_token=fake-token.fake-signature")).status).toBe(401);
  });

  it("the real token with a forged signature → 401", async () => {
    const [name, value] = cookie.split("=");
    const token = decodeURIComponent(value).split(".")[0];
    expect((await list(`${name}=${encodeURIComponent(`${token}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`)}`)).status).toBe(401);
  });

  it("an expired session → 401, even with its genuine cookie", async () => {
    await client.query(`UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE user_id = $1`, [userId]);
    expect((await list(cookie)).status).toBe(401);
  });

  it("a deleted session (signed out / revoked) → 401", async () => {
    await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    expect((await list(cookie)).status).toBe(401);
  });
});
