import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Value-based leak test on real Postgres: a distinctive cost (3777.77) is stored on an item and on a
// variant override, then every response a seller can get is fetched raw. The value must appear
// nowhere — whatever the key is called. (The owner sees it, which proves the value is really there.)
//   TEST_DATABASE_URL=postgres://… npm run test:db

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) process.env.DATABASE_URL = URL_;

const COST = "3777.77";
const who = vi.hoisted(() => ({ role: "seller" as "owner" | "seller", id: "" }));
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: async () => ({ user: { id: who.id, name: "Leak test", role: who.role }, session: { id: "s" } }) } },
}));

describe.skipIf(!URL_)("no cost value in any seller response (Postgres)", () => {
  const client = new pg.Client({ connectionString: URL_ });
  const token = `leaktest${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  const userId = randomUUID();
  const itemId = randomUUID();
  let detail: (r: Request, c: { params: { id: string } }) => Promise<Response>;
  let list: (r: Request) => Promise<Response>;
  let endPool: () => Promise<void>;

  const raw = async (res: Promise<Response>) => {
    const r = await res;
    expect(r.status).toBe(200);
    return r.text();
  };
  const get = (p: string) => new Request(`http://localhost:3000${p}`, { headers: { host: "localhost:3000" } });

  /** Every seller-visible response that can carry this item. Activity log joins in step 3. */
  const sellerVisible = async () => [
    await raw(detail(get(`/api/items/${itemId}`), { params: { id: itemId } })),
    await raw(list(get(`/api/items?q=${token}`))),
  ];

  beforeAll(async () => {
    who.id = userId;
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    await client.query(`INSERT INTO users (id, name, email, role) VALUES ($1, 'Leak test', $2, 'owner')`, [userId, `${token}@example.invalid`]);
    await client.query(
      `INSERT INTO items (id, title, selling_price, cost_price, status, created_by, updated_by) VALUES ($1, $2, 4999, ${COST}, 'active', $3, $3)`,
      [itemId, `${token} saree`, userId]
    );
    await client.query(
      `INSERT INTO variants (item_id, size, quantity, selling_price_override, cost_price_override) VALUES ($1, 'M', 2, 4499, ${COST}), ($1, 'L', 1, NULL, NULL)`,
      [itemId]
    );
    ({ GET: list } = await import("@/app/api/items/route"));
    ({ GET: detail } = await import("@/app/api/items/[id]/route"));
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    await client.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.end();
    await endPool?.();
  });

  it("owner: the cost value is really there (detail)", async () => {
    who.role = "owner";
    expect(await raw(detail(get(`/api/items/${itemId}`), { params: { id: itemId } }))).toContain(COST);
  });

  it("seller: the value appears in none of the responses, under any key", async () => {
    who.role = "seller";
    const bodies = await sellerVisible();
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      expect(body).not.toContain(COST);
      expect(body).not.toContain("3777.7"); // no rounded form either
    }
  });
});
