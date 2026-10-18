#!/usr/bin/env node
// Database tool (runs on the host, in the dev container and in the production image):
//
//   node scripts/db.mjs migrate        apply pending Drizzle migrations from db/migrations
//   node scripts/db.mjs seed           apply db/seeds/*.sql (+ db/seeds/dev/*.sql with --dev)
//   node scripts/db.mjs status         list applied / pending migrations
//
// Migrations are generated from db/schema.ts with `npm run db:generate`. Seeds are plain SQL
// that is safe to re-run (ON CONFLICT DO NOTHING) and run in one transaction.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(root, "db", "migrations");
const SEEDS = path.join(root, "db", "seeds");

const [command = "status", ...flags] = process.argv.slice(2);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Docker sets it from .env; on the host copy madhurya-vastra/.env.example to .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function connect(tries = 30) {
  for (let i = 1; ; i++) {
    try {
      return await client.connect();
    } catch (err) {
      if (i >= tries) throw new Error(`Cannot reach the database: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

const sqlFiles = async (dir) =>
  (await readdir(dir, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => path.join(dir, e.name))
    .sort();

async function journal() {
  const raw = await readFile(path.join(MIGRATIONS, "meta", "_journal.json"), "utf8");
  return JSON.parse(raw).entries.map((e) => e.tag);
}

async function appliedCount() {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`,
  );
  if (!rows[0].n) return 0;
  return (await client.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations")).rows[0].n;
}

async function runMigrate() {
  const before = await appliedCount();
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });
  const after = await appliedCount();
  console.log(after > before ? `${after - before} migration(s) applied.` : "Database is up to date.");
}

async function runSeed() {
  const files = await sqlFiles(SEEDS);
  if (flags.includes("--dev")) files.push(...(await sqlFiles(path.join(SEEDS, "dev"))));
  await client.query("BEGIN");
  try {
    for (const f of files) {
      await client.query(await readFile(f, "utf8"));
      console.log(`seeded ${path.relative(SEEDS, f)}`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function runStatus() {
  const tags = await journal();
  const n = await appliedCount();
  tags.forEach((tag, i) => console.log(`${i < n ? "applied" : "PENDING"}  ${tag}`));
}

try {
  await connect();
  if (command === "migrate") await runMigrate();
  else if (command === "seed") await runSeed();
  else if (command === "status") await runStatus();
  else throw new Error(`Unknown command "${command}". Use migrate, seed or status.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
