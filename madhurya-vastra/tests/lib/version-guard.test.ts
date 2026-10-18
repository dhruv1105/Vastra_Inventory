import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The item version token must stay an opaque string (see Item.version in types/index.ts). A Date
// drops microseconds, so two saves inside one millisecond would look identical. This fails if code
// ever parses it: new Date(…version…) or Date.parse(…version…).
const ROOT = path.join(__dirname, "..", "..");
const DIRS = ["app", "components", "context", "hooks", "lib"];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : files(p);
    return /\.(ts|tsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

describe("version token is never parsed into a Date", () => {
  it("no new Date(…version…) or Date.parse(…version…) in app code", () => {
    const offenders = DIRS.flatMap((d) => files(path.join(ROOT, d)))
      .filter((f) => /(new\s+Date|Date\.parse)\s*\([^)]*version/i.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
