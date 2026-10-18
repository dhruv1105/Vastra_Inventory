import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// The concurrency version is updated_at as Postgres text, kept as an opaque string. Two saves 0.5 ms
// apart must still be told apart — a JS Date (milliseconds) could not. Step 5 adds the PATCH 409 case.

const URL_ = process.env.TEST_DATABASE_URL;
if (URL_) process.env.DATABASE_URL = URL_;

describe.skipIf(!URL_)("version token keeps microseconds (Postgres)", () => {
  const client = new pg.Client({ connectionString: URL_ });
  const itemId = randomUUID();
  let loadItemFull: (id: string) => Promise<{ version: string } | null>;
  let endPool: () => Promise<void>;

  beforeAll(async () => {
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: path.join(__dirname, "..", "..", "db", "migrations") });
    await client.query(`INSERT INTO items (id, title, selling_price) VALUES ($1, 'version test', 999)`, [itemId]);
    ({ loadItemFull } = await import("@/lib/items"));
    const db = await import("@/lib/db");
    endPool = () => db.pool.end();
  });

  afterAll(async () => {
    await client.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    await client.end();
    await endPool?.();
  });

  it("two updates 0.5 ms apart give different versions, and the old one no longer matches", async () => {
    await client.query(`UPDATE items SET updated_at = '2026-10-18 06:12:00.123000+00' WHERE id = $1`, [itemId]);
    const v1 = (await loadItemFull(itemId))!.version;
    await client.query(`UPDATE items SET updated_at = '2026-10-18 06:12:00.123500+00' WHERE id = $1`, [itemId]);
    const v2 = (await loadItemFull(itemId))!.version;

    expect(typeof v1).toBe("string");
    expect(v1).not.toBe(v2);
    expect(v2).toMatch(/\.1235(00)?\+/); // microseconds survive the round trip
    // The check the save will use: Postgres compares the token as timestamptz, never via JS Date.
    const match = (v: string) => client.query(`SELECT updated_at = $2::timestamptz AS same FROM items WHERE id = $1`, [itemId, v]).then((r) => r.rows[0].same);
    expect(await match(v2)).toBe(true);
    expect(await match(v1)).toBe(false);
    // Why a Date would be wrong: both round to the same millisecond.
    const ms = (v: string) => Math.floor(Number(v.match(/\.(\d+)/)![1].padEnd(6, "0")) / 1000);
    expect(ms(v1)).toBe(ms(v2));
  });
});
