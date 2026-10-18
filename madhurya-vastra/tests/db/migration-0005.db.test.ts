import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Migration 0005 (variants_live_unique) on real Postgres, in scratch databases it creates and drops
// (needs CREATEDB, which the Docker dev user has). Checks: it stops with a clear message on live
// duplicates; it drops an old full UNIQUE (item_id, size, color_id); the index blocks a live duplicate
// (case/spacing ignored, "no colour" = "no colour") and lets a removed size/colour be added again.

const URL_ = process.env.TEST_DATABASE_URL;
const MIGRATIONS = path.join(__dirname, "..", "..", "db", "migrations");

/** A copy of the migrations folder that stops at 0004, to set up the state 0005 runs against. */
function migrationsUpTo0004(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mig0004-"));
  fs.mkdirSync(path.join(dir, "meta"));
  const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS, "meta", "_journal.json"), "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 4);
  fs.writeFileSync(path.join(dir, "meta", "_journal.json"), JSON.stringify(journal));
  for (const e of journal.entries as { tag: string; idx: number }[]) {
    fs.copyFileSync(path.join(MIGRATIONS, `${e.tag}.sql`), path.join(dir, `${e.tag}.sql`));
    const snap = `${String(e.idx).padStart(4, "0")}_snapshot.json`;
    if (fs.existsSync(path.join(MIGRATIONS, "meta", snap))) fs.copyFileSync(path.join(MIGRATIONS, "meta", snap), path.join(dir, "meta", snap));
  }
  return dir;
}

describe.skipIf(!URL_)("migration 0005: variants_live_unique (Postgres)", () => {
  const admin = new pg.Client({ connectionString: URL_ });
  const made: string[] = [];
  const upTo0004 = URL_ ? migrationsUpTo0004() : "";

  /** A fresh database migrated to 0004, with one item. */
  async function freshAt0004() {
    const name = `vastra_mig_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
    await admin.query(`CREATE DATABASE ${name}`);
    made.push(name);
    const url = new URL(URL_!);
    url.pathname = `/${name}`;
    const db = new pg.Client({ connectionString: url.toString() });
    await db.connect();
    await migrate(drizzle(db), { migrationsFolder: upTo0004 });
    const item = randomUUID();
    await db.query(`INSERT INTO items (id, title, selling_price) VALUES ($1, 'Migration test', 999)`, [item]);
    return { db, item };
  }
  const to0005 = (db: pg.Client) => migrate(drizzle(db), { migrationsFolder: MIGRATIONS });

  beforeAll(async () => {
    await admin.connect();
  });
  afterAll(async () => {
    for (const name of made) await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  });

  it("stops with a clear message listing live duplicates, then runs once they are removed", async () => {
    const { db, item } = await freshAt0004();
    await db.query(`INSERT INTO variants (item_id, size, quantity) VALUES ($1, 'M', 1), ($1, ' m ', 2)`, [item]);
    const err = await to0005(db).catch((e) => e);
    expect(String(err?.message ?? err)).toMatch(/Failed query|Migration 0005 stopped/);
    const cause = String(err?.cause?.message ?? err?.message);
    expect(cause).toContain("Migration 0005 stopped: some items have the same size and colour twice");
    expect(cause).toContain(item);
    // Nothing half-done: the index isn't there yet.
    expect((await db.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'variants_live_unique'`)).rowCount).toBe(0);

    await db.query(`UPDATE variants SET deleted_at = now() WHERE item_id = $1 AND size = ' m '`, [item]);
    await to0005(db);
    expect((await db.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'variants_live_unique'`)).rowCount).toBe(1);
    await db.end();
  });

  it("drops an old full UNIQUE (item_id, size, color_id), whatever its name", async () => {
    const { db } = await freshAt0004();
    await db.query(`ALTER TABLE variants ADD CONSTRAINT legacy_variant_combo UNIQUE (item_id, size, color_id)`);
    await db.query(`CREATE UNIQUE INDEX legacy_variant_combo_idx ON variants (size, item_id, color_id)`);
    await to0005(db);
    expect((await db.query(`SELECT 1 FROM pg_constraint WHERE conname = 'legacy_variant_combo'`)).rowCount).toBe(0);
    expect((await db.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'legacy_variant_combo_idx'`)).rowCount).toBe(0);
    await db.end();
  });

  it("blocks a live duplicate; a removed size/colour can be added again", async () => {
    const { db, item } = await freshAt0004();
    await to0005(db);
    const add = (size: string, color: string | null = null) =>
      db.query(`INSERT INTO variants (item_id, size, color_id, quantity) VALUES ($1, $2, $3, 0) RETURNING id`, [item, size, color]);
    const isDuplicate = (e: { code?: string; constraint?: string }) => e.code === "23505" && e.constraint === "variants_live_unique";

    const first = await add("M");
    // Same size ignoring case/spacing, both "no colour" → refused.
    expect(isDuplicate(await add(" m ").catch((e) => e))).toBe(true);
    expect(isDuplicate(await add("Free  Size").then(() => add("free size")).catch((e) => e))).toBe(true);

    // Remove (soft-delete) it, then add it again → allowed.
    await db.query(`UPDATE variants SET deleted_at = now() WHERE id = $1`, [first.rows[0].id]);
    await expect(add("M")).resolves.toBeTruthy();
    expect((await db.query(`SELECT count(*)::int AS n FROM variants WHERE item_id = $1 AND size = 'M'`, [item])).rows[0].n).toBe(2);
    await db.end();
  });
});
