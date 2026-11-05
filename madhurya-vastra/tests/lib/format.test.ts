import { describe, expect, it } from "vitest";
import { formatDateTimeIST, margin, timeAgo } from "@/lib/format";

describe("timeAgo", () => {
  const now = new Date("2026-11-05T10:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  it.each([
    [20_000, "just now"],
    [60_000, "1 minute ago"],
    [5 * 60_000, "5 minutes ago"],
    [60 * 60_000, "1 hour ago"],
    [3 * 3600_000, "3 hours ago"],
    [25 * 3600_000, "yesterday"],
    [4 * 86400_000, "4 days ago"],
  ])("%i ms ago → %s", (ms, words) => expect(timeAgo(ago(ms), now)).toBe(words));

  it("a week or more → the date in IST (late evening UTC is already the next day in India)", () => {
    expect(timeAgo("2026-10-11T20:00:00Z", now)).toBe("12 Oct 2026");
  });

  it("full date and time in IST", () => {
    expect(formatDateTimeIST("2026-11-05T10:12:00Z")).toMatch(/5 Nov 2026.*3:42\s?pm/i);
  });
});

describe("margin", () => {
  it("rupees and percent (one decimal), exact to the paisa", () => {
    expect(margin(2499, 1600)).toEqual({ rupees: 899, percent: 36 });
    expect(margin(1999, 1200)).toEqual({ rupees: 799, percent: 40 });
    expect(margin(1000, 333)).toEqual({ rupees: 667, percent: 66.7 });
    expect(margin(0.3, 0.1)).toEqual({ rupees: 0.2, percent: 66.7 }); // float maths would give 0.19999…
  });
  it("no cost or no price → null; selling below cost → negative", () => {
    expect(margin(2499, null)).toBeNull();
    expect(margin(0, 100)).toBeNull();
    expect(margin(1000, 1200)).toEqual({ rupees: -200, percent: -20 });
  });
});
