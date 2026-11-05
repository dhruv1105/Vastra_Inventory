import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Every READ of activity_log must go through lib/activity.ts (readActivity → central cost filter),
// so sellers never see cost in before/after. Writes (INSERT INTO activity_log) may live anywhere.
const ROOT = path.join(__dirname, "..", "..");
const DIRS = ["app", "components", "context", "hooks", "lib", "scripts"];
const ALLOWED = path.join("lib", "activity.ts");

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : files(p);
    return /\.(ts|tsx|mjs|js)$/.test(e.name) ? [p] : [];
  });
}

const READS = [/\b(FROM|JOIN)\s+"?activity_log\b/i, /\.from\(\s*activityLog\s*\)/, /\bquery\.activityLog\b/];

describe("activity_log is read only through lib/activity.ts", () => {
  it("no other file selects from it", () => {
    const offenders = DIRS.flatMap((d) => files(path.join(ROOT, d)))
      .filter((f) => path.relative(ROOT, f) !== ALLOWED)
      .filter((f) => READS.some((re) => re.test(fs.readFileSync(f, "utf8"))))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("the guard really catches a read (self-check)", () => {
    expect(READS.some((re) => re.test(`SELECT * FROM activity_log WHERE x`))).toBe(true);
    expect(READS.some((re) => re.test(`db.select().from(activityLog)`))).toBe(true);
    expect(READS.some((re) => re.test(`INSERT INTO activity_log (actor_id) VALUES ($1)`))).toBe(false);
  });
});
