/** Only same-site paths, so ?next= can't send people to another website. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/inventory";
}

/** "/login" or "/login?next=<path>" (no next for the default page). */
export function loginUrl(next: string | null | undefined): string {
  const target = safeNext(next);
  return target === "/inventory" && !next ? "/login" : `/login?next=${encodeURIComponent(target)}`;
}

export type LoginGate = { kind: "render" } | { kind: "redirect"; to: string };

/**
 * What /login does on the server, from the REAL session check (not just the cookie):
 * - signed in → go where they were heading (or /inventory);
 * - a session cookie that is no longer valid (expired, revoked, fake) → /login/clear, which
 *   removes it and comes back, so it can't linger;
 * - otherwise → show the form.
 */
export function loginGate({ signedIn, hasCookie, next }: { signedIn: boolean; hasCookie: boolean; next: string | null | undefined }): LoginGate {
  if (signedIn) return { kind: "redirect", to: safeNext(next) };
  if (hasCookie) return { kind: "redirect", to: `/login/clear${next ? `?next=${encodeURIComponent(safeNext(next))}` : ""}` };
  return { kind: "render" };
}
