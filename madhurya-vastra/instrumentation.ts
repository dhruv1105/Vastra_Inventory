// Runs once when the server starts (Next.js instrumentation hook). Missing required production
// config stops the server here instead of failing on the first sign-in.
export function register() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  const missing = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required settings: ${missing.join(", ")}. See .env.example.`);
    process.exit(1);
  }
}
