import { NextResponse } from "next/server";
import { auth } from "./server";
import type { Role } from "./roles";

export type GuardUser = { id: string; name: string; role: Role };

type Guarded = { user: GuardUser; response?: undefined } | { user?: undefined; response: NextResponse };

const deny = (status: 401 | 403, error: string) => ({ response: NextResponse.json({ error }, { status }) });

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** Writes must come from this site (cookies are sent cross-site in some cases; this blocks CSRF). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>();
  if (process.env.BETTER_AUTH_URL) allowed.add(new URL(process.env.BETTER_AUTH_URL).origin);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (host) allowed.add(`${proto}://${host}`);
  return allowed.has(origin);
}

/**
 * Every API route starts with this. The server decides who is acting — never a userId from the
 * request body.
 *
 *   const g = await requireUser(request, { role: "owner" });
 *   if (g.response) return g.response;
 *   … g.user.id …
 *
 * 401: not signed in. 403: signed in but not allowed, account turned off, or a write from
 * another site.
 */
export async function requireUser(request: Request, options: { role?: Role } = {}): Promise<Guarded> {
  if (!SAFE.has(request.method) && !sameOrigin(request)) {
    return deny(403, "This request came from another site and was blocked.");
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return deny(401, "Sign in to continue.");
  const u = session.user as typeof session.user & { role?: string; banned?: boolean | null };
  if (u.banned) return deny(403, "This account is turned off. Ask the owner to turn it back on.");
  const role: Role = u.role === "owner" ? "owner" : "seller";
  if (options.role === "owner" && role !== "owner") return deny(403, "Only the owner can do this.");
  return { user: { id: u.id, name: u.name, role } };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
