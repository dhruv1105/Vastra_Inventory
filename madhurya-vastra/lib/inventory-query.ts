import { UUID } from "@/lib/auth/guard";

// Server-only helpers for GET /api/items: turning search text into a tsquery and the page cursor.

const MAX_WORDS = 8;
/** Anything that is not a letter, combining mark (Indic vowel signs) or digit. Built from a string
 *  because the TypeScript target (ES5) rejects a /u literal; Node runs it natively. */
const NON_WORD = new RegExp("[^\\p{L}\\p{M}\\p{N}]+", "u");

/**
 * Search text → a prefix tsquery for `to_tsquery('simple', …)`: "lav geo" → "lav:* & geo:*".
 * Only letters, combining marks and digits survive, so tsquery operators typed by a user
 * ( & | ! ( ) : * ' ) can never cause a syntax error. Returns null when nothing is left.
 */
export function toPrefixQuery(text: string): string | null {
  const words = text
    .normalize("NFKC")
    .toLowerCase()
    .split(NON_WORD)
    .filter(Boolean)
    .slice(0, MAX_WORDS);
  return words.length ? words.map((w) => `${w}:*`).join(" & ") : null;
}

/** Postgres `timestamptz::text`, e.g. "2026-10-18 06:12:00.123456+00" or "…+05:30". */
const PG_TIMESTAMPTZ = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;

export type Cursor = { createdAt: string; id: string };

/**
 * The last row of a page, as an opaque string. `createdAt` must be the database's own text form
 * (microseconds kept): a JS Date would round to milliseconds and skip rows.
 */
export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt}|${c.id}`, "utf8").toString("base64url");
}

/** Null for anything that is not a cursor this API produced. */
export function decodeCursor(raw: string): Cursor | null {
  if (raw.length > 200 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  const text = Buffer.from(raw, "base64url").toString("utf8");
  const bar = text.lastIndexOf("|");
  if (bar < 0) return null;
  const createdAt = text.slice(0, bar);
  const id = text.slice(bar + 1);
  return PG_TIMESTAMPTZ.test(createdAt) && UUID.test(id) ? { createdAt, id } : null;
}
