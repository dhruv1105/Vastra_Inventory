// Session cookie names, with no imports, so the Edge middleware can use them. The server config
// (lib/auth/server.ts) reads COOKIE_PREFIX from here too, so the names can't drift apart.
//
// better-auth names the cookie `${prefix}.session_token`, adds `__Secure-` when it is served over
// HTTPS, and older versions used `${prefix}-session_token` — the same four names its own
// getSessionCookie() looks for.

export const COOKIE_PREFIX = "mv";

export const SESSION_COOKIE_NAMES = [
  `${COOKIE_PREFIX}.session_token`,
  `__Secure-${COOKIE_PREFIX}.session_token`,
  `${COOKIE_PREFIX}-session_token`,
  `__Secure-${COOKIE_PREFIX}-session_token`,
] as const;

/** True when a session cookie is present. Presence only: it says nothing about whether it is valid. */
export function hasSessionCookie(cookies: { get(name: string): { value: string } | undefined }): boolean {
  return SESSION_COOKIE_NAMES.some((name) => !!cookies.get(name)?.value);
}
