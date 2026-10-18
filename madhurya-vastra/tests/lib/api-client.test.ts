import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR, apiFetch } from "@/lib/api-client";

// apiFetch runs in the browser; here window.location and fetch are stand-ins.
const assign = vi.fn();
const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  assign.mockClear();
  vi.stubGlobal("window", { location: { pathname: "/items/abc", search: "?tab=photos", assign } });
});
afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns data on success", async () => {
    vi.stubGlobal("fetch", respond(200, { data: { id: "x" } }));
    await expect(apiFetch("/api/items/x")).resolves.toEqual({ id: "x" });
  });

  it("401 → /login?next=<this page, with its query>, and never settles (no error flash)", async () => {
    vi.stubGlobal("fetch", respond(401, { error: "Sign in to continue." }));
    const settled = vi.fn();
    apiFetch("/api/items").then(settled, settled);
    await new Promise((r) => setTimeout(r, 20));
    expect(assign).toHaveBeenCalledWith("/login?next=%2Fitems%2Fabc%3Ftab%3Dphotos");
    expect(settled).not.toHaveBeenCalled();
  });

  it("other failures throw ApiError with the server's sentence and status", async () => {
    vi.stubGlobal("fetch", respond(404, { error: "Item not found" }));
    await expect(apiFetch("/api/items/x")).rejects.toMatchObject({ name: "ApiError", status: 404, message: "Item not found" });
    expect(assign).not.toHaveBeenCalled();
  });

  it("network failure → ApiError(status 0) with a connection message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const err = await apiFetch("/api/items").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, message: NETWORK_ERROR });
  });

  it("aborted requests rethrow the AbortError (callers ignore it)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("aborted", "AbortError"); }));
    await expect(apiFetch("/api/items")).rejects.toMatchObject({ name: "AbortError" });
  });
});
