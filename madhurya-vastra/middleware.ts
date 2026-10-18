import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/auth/cookie";

// Page gate for protected pages only: no session cookie → /login (with the page to return to).
// It only checks that a cookie exists. The real session check is on the server: every API route
// (lib/auth/guard.ts) and the login page, which sends signed-in visitors on and clears a stale
// cookie. (The middleware must not send cookie holders away from /login: with an expired or
// revoked cookie that bounced them back to a blank page.)
// Runs on the Edge runtime: import nothing but next/server and lib/auth/cookie (no better-auth —
// its cookie module pulls in JWT code the Edge runtime doesn't support).

const PUBLIC = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = hasSessionCookie(request.cookies);
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes (they answer 401 themselves), Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|brand|uploads|favicon.ico|manifest.json|sw.js|workbox-.*|kit).*)"],
};
