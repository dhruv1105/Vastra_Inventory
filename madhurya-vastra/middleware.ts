import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Page gate: no session cookie → /login (with the page to return to); signed in → skip /login.
// This only checks that a cookie exists; the session itself is verified by every API route
// (lib/auth/guard.ts) and by the client session fetch, so a stale cookie still ends at /login.

const PUBLIC = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = !!getSessionCookie(request, { cookiePrefix: "mv" });
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (hasSession && (isPublic || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inventory";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes (they answer 401 themselves), Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|brand|uploads|favicon.ico|manifest.json|sw.js|workbox-.*|kit).*)"],
};
