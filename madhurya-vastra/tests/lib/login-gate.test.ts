import { describe, expect, it } from "vitest";
import { loginGate, loginUrl, safeNext } from "@/lib/auth/next";

describe("safeNext", () => {
  it("keeps same-site paths", () => expect(safeNext("/items/abc?x=1")).toBe("/items/abc?x=1"));
  it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "inventory"])("refuses %s → /inventory", (v) =>
    expect(safeNext(v)).toBe("/inventory"),
  );
});

describe("loginUrl", () => {
  it("adds ?next for a page", () => expect(loginUrl("/inventory?q=lav")).toBe("/login?next=%2Finventory%3Fq%3Dlav"));
  it("plain /login when there is nowhere to go back to", () => expect(loginUrl(null)).toBe("/login"));
});

describe("loginGate (what /login does on the server)", () => {
  it("valid session → straight to ?next", () => {
    expect(loginGate({ signedIn: true, hasCookie: true, next: "/items/abc" })).toEqual({ kind: "redirect", to: "/items/abc" });
  });
  it("valid session, unsafe ?next → /inventory", () => {
    expect(loginGate({ signedIn: true, hasCookie: true, next: "//evil.example" })).toEqual({ kind: "redirect", to: "/inventory" });
  });
  it("cookie present but session not valid (expired / revoked / fake) → /login/clear, keeping ?next", () => {
    expect(loginGate({ signedIn: false, hasCookie: true, next: "/items/abc" })).toEqual({ kind: "redirect", to: "/login/clear?next=%2Fitems%2Fabc" });
    expect(loginGate({ signedIn: false, hasCookie: true, next: undefined })).toEqual({ kind: "redirect", to: "/login/clear" });
  });
  it("no cookie → show the form (never a redirect, so no loop)", () => {
    expect(loginGate({ signedIn: false, hasCookie: false, next: "/items/abc" })).toEqual({ kind: "render" });
  });
});
