import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookie";
import { loginUrl, safeNext } from "@/lib/auth/next";

// GET /login/clear?next=… — reached from /login when a session cookie is present but not valid.
// Removes every auth cookie, then shows the login form with the same ?next. A server component
// can't change cookies, so this small route does it.
// It checks the session itself first: a link to this URL can't sign out someone whose session is
// still valid — they are simply sent on to ?next.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  const valid = !!session && !(session.user as { banned?: boolean | null }).banned;
  if (valid) return NextResponse.redirect(new URL(safeNext(next), request.url));

  const res = NextResponse.redirect(new URL(loginUrl(next), request.url));
  for (const name of AUTH_COOKIE_NAMES) {
    res.cookies.set(name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: name.startsWith("__Secure-") });
  }
  return res;
}
