import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Runs GET /api/items against a real Postgres. Needs TEST_DATABASE_URL (a disposable or dev
// database — the test applies migrations and deletes only the rows it created):
//   TEST_DATABASE_URL=postgres://… npm run test:db
// Plain `npm test` skips it.

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) process.env.DATABASE_URL = URL_; // lib/db reads this when first imported

const OWNER_ID = randomUUID();
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: async () => ({ user: { id: OWNER_ID, name: "Test owner", role: "owner" }, session: { id: "s" } }) } },
}));

describe.skipIf(!URL_)("GET /api/items on Postgres", () => {
  const token = `pagetest${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const client = new pg.Client({ connectionString: URL_ });
  const inserted: string[] = [];
  let GET: (r: Request) => Promise<Response>;
  let endPool: () => Promise<void>;

  beforeAll(async () => {
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    await client.query(`INSERT INTO users (id, name, email, role) VALUES ($1, 'Test owner', $2, 'owner')`, [
      OWNER_ID,
      `${token}@example.invalid`,
    ]);
    // 25 items in ONE transaction: NOW() is the transaction start, so they all share created_at.
    await client.query("BEGIN");
    for (let n = 1; n <= 25; n++) {
      const { rows } = await client.query(
        `INSERT INTO items (title, selling_price, status, created_by, updated_by, is_one_of_a_kind)
         VALUES ($1, 999, 'active', $2, $2, $3) RETURNING id`,
        [`${token} item ${n}`, OWNER_ID, n === 1]
      );
      inserted.push(rows[0].id);
    }
    await client.query("COMMIT");
    ({ GET } = await import("@/app/api/items/route"));
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    if (inserted.length) await client.query(`DELETE FROM items WHERE id = ANY($1::uuid[])`, [inserted]);
    await client.query(`DELETE FROM users WHERE id = $1`, [OWNER_ID]);
    await client.end();
    await endPool?.();
  });

  const page = async (cursor?: string) => {
    const qs = new URLSearchParams({ q: token, ...(cursor ? { cursor } : {}) });
    const res = await GET(new Request(`http://localhost:3000/api/items?${qs}`, { headers: { host: "localhost:3000" } }));
    expect(res.status).toBe(200);
    return (await res.json()).data as { items: { id: string }[]; nextCursor: string | null };
  };

  it("the 25 items really share one created_at", async () => {
    const { rows } = await client.query(`SELECT COUNT(DISTINCT created_at)::int AS n FROM items WHERE id = ANY($1::uuid[])`, [inserted]);
    expect(rows[0].n).toBe(1);
  });

  it("pages 20 + 5 through all 25 with no repeats or gaps", async () => {
    const first = await page();
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await page(first.nextCursor!);
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();

    const seen = [...first.items, ...second.items].map((i) => i.id);
    expect(new Set(seen).size).toBe(25);
    expect([...seen].sort()).toEqual([...inserted].sort());
    // Same created_at → id DESC decides the order.
    expect(seen).toEqual([...inserted].sort().reverse());
    // is_one_of_a_kind comes from the column (only item 1 was flagged).
    const flagged = [...first.items, ...second.items].filter((i) => (i as { isOneOfAKind?: boolean }).isOneOfAKind);
    expect(flagged.map((i) => i.id)).toEqual([inserted[0]]);
  });
});
