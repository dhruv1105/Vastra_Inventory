import { describe, expect, it } from "vitest";
import { DRAFT_MAX_AGE_MS, usableDraft } from "@/lib/form-draft";

// Which kept drafts come back after signing in again (the IndexedDB part is checked in the browser).
describe("usableDraft", () => {
  const now = 1_800_000_000_000;
  const draft = { userId: "u1", savedAt: now - 60_000, value: { title: "Lavender saree" } };

  it("the same person, within a day → their input", () => {
    expect(usableDraft(draft, "u1", now)).toEqual({ title: "Lavender saree" });
  });

  it("someone else signed in on this phone → nothing", () => {
    expect(usableDraft(draft, "u2", now)).toBeNull();
  });

  it("older than a day, or from the future (clock changed) → nothing", () => {
    expect(usableDraft({ ...draft, savedAt: now - DRAFT_MAX_AGE_MS - 1 }, "u1", now)).toBeNull();
    expect(usableDraft({ ...draft, savedAt: now + 60_000 }, "u1", now)).toBeNull();
  });

  it("no draft → nothing", () => {
    expect(usableDraft(null, "u1", now)).toBeNull();
    expect(usableDraft(undefined, "u1", now)).toBeNull();
  });
});
