import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signInOptions } from "@/lib/auth/server";
import { hasSessionCookie } from "@/lib/auth/cookie";
import { loginGate } from "@/lib/auth/next";
import LoginScreen from "./LoginScreen";

// Server part of the login page.
// 1. Real session check (the middleware only sees whether a cookie exists): signed-in visitors go
//    where they were heading; a cookie that is no longer valid (expired, revoked, fake) goes through
//    /login/clear to be removed, then the form shows — never a redirect loop or a blank page.
// 2. Decides at request time which sign-in methods are configured (Google keys, SMS provider), so
//    they can be switched on with environment variables alone.
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const hasCookie = hasSessionCookie(cookies());
  const session = hasCookie ? await auth.api.getSession({ headers: headers() }).catch(() => null) : null;
  // A turned-off account counts as signed out here; signing in again explains why.
  const signedIn = !!session && !(session.user as { banned?: boolean | null }).banned;

  const gate = loginGate({ signedIn, hasCookie, next: searchParams.next });
  if (gate.kind === "redirect") redirect(gate.to);

  return <LoginScreen options={signInOptions()} />;
}
