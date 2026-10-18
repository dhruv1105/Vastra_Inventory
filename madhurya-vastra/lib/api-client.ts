// The one way client screens call our API (app/api/*). Every new screen uses apiFetch.
//
// - Success: resolves with the response's `data`.
// - 401 (session ended: expired, signed out elsewhere, password reset, account turned off):
//   sends the browser to /login?next=<this page>, and never resolves, so the screen doesn't flash
//   an error while the page changes. After signing in, ?next brings the person back.
// - Any other failure: throws ApiError with the server's plain sentence and the status.
// - Network failure: throws ApiError (status 0) with a connection message.
// - Aborted (AbortSignal): rethrows the AbortError, which callers ignore.

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";
export const GENERIC_ERROR = "Something went wrong. Try again.";

/** Where a 401 sends the browser: the login form, coming back to this page afterwards. */
export function loginRedirectUrl(location: Pick<Location, "pathname" | "search">): string {
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}

export const isAbortError = (err: unknown) => (err as Error | null)?.name === "AbortError";

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = init.body !== undefined ? { "Content-Type": "application/json", ...init.headers } : init.headers;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError(NETWORK_ERROR, 0);
  }
  if (res.status === 401) {
    window.location.assign(loginRedirectUrl(window.location));
    return new Promise<T>(() => {}); // the page is changing; nothing to show
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(typeof body.error === "string" && body.error ? body.error : GENERIC_ERROR, res.status);
  return body.data as T;
}
