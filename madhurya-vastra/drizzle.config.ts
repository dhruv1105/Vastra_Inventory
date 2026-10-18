import { defineConfig } from "drizzle-kit";

// `npm run db:generate` writes SQL migrations from db/schema.ts; `npm run db:migrate` applies them.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
