import { vi } from "vitest";

// Shared fakes for route-handler tests: a session (better-auth) and the database (pg).
// Route files are imported for real; only lib/auth/server and lib/db are replaced.

export const ORIGIN = "http://localhost:3000";

export type FakeUser = { id: string; name: string; role: "owner" | "seller"; banned?: boolean; mustChangePassword?: boolean };
export const OWNER: FakeUser = { id: "00000000-0000-0000-0000-0000000000a1", name: "Owner", role: "owner" };
export const SELLER: FakeUser = { id: "00000000-0000-0000-0000-0000000000b2", name: "Seller", role: "seller" };

export const state: { user: FakeUser | null } = { user: null };

/** Every SQL statement the handlers ran: [sql, params]. */
export const calls: Array<[string, unknown[] | undefined]> = [];

/** What the next queries return, matched by a substring of the SQL. */
export const results: Array<{ match: string; rows: unknown[] }> = [];

function run(sql: string, params?: unknown[]) {
  calls.push([sql, params]);
  const hit = results.find((r) => sql.includes(r.match));
  return Promise.resolve({ rows: hit ? hit.rows : [], rowCount: hit ? hit.rows.length : 0 });
}

/** better-auth server API: getSession reads `state.user`; staff calls are recorded fakes. */
export const authApi = {
  getSession: vi.fn(async () => (state.user ? { user: state.user, session: { id: "s1" } } : null)),
  createUser: vi.fn(async ({ body }: { body: { name: string } }) => ({ user: { id: "33333333-3333-3333-3333-333333333333", name: body.name } })),
  setUserPassword: vi.fn(async () => ({ status: true })),
  revokeUserSessions: vi.fn(async () => ({ success: true })),
  setRole: vi.fn(async () => ({ user: {} })),
  banUser: vi.fn(async () => ({ user: {} })),
  unbanUser: vi.fn(async () => ({ user: {} })),
  changePassword: vi.fn(async () => ({ token: "t" })),
};

vi.mock("@/lib/auth/server", () => ({ auth: { api: authApi } }));

vi.mock("@/lib/db", () => ({
  query: vi.fn((sql: string, params?: unknown[]) => run(sql, params)),
  pool: { connect: vi.fn(async () => ({ query: vi.fn((sql: string, params?: unknown[]) => run(sql, params)), release: vi.fn() })) },
}));

export function reset(user: FakeUser | null) {
  state.user = user;
  calls.length = 0;
  results.length = 0;
  Object.values(authApi).forEach((f) => f.mockClear());
}

export function req(method: string, path: string, opts: { body?: unknown; origin?: string | null } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000", "content-type": "application/json" };
  const origin = opts.origin === undefined ? ORIGIN : opts.origin;
  if (origin) headers.origin = origin;
  return new Request(`${ORIGIN}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
}

export const ctx = (id: string) => ({ params: { id } });
export const sqlLike = (fragment: string) => calls.filter(([sql]) => sql.includes(fragment));
