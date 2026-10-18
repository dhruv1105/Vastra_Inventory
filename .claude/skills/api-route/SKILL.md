---
name: api-route
description: >
  Load when writing or changing anything under madhurya-vastra/app/api/. Defines the route
  handler pattern used in this app — response shape, validation, transactions, activity_log,
  error handling, dev-only routes — and the known security gaps a new route must not copy.
---

# API routes — Madhurya Vastra

Reference implementation: `app/api/items/route.ts` (validation → transaction → files → log).

## 1. Shape

```ts
// success
return NextResponse.json({ data }, { status: 200 | 201 });
// failure — a plain sentence the screen can show
return NextResponse.json({ error: "Selling price must be greater than 0" }, { status: 400 });
```

Type on the client: `ApiResponse<T>` in `types/index.ts`. Status codes: 400 invalid input,
401 not signed in, 403 not allowed, 404 not found, 409 duplicate (Postgres `23505`), 500 unexpected.

## 2. Handler steps

0. **Guard first** — `const g = await requireUser(request, { role? }); if (g.response) return g.response;`
   (`lib/auth/guard.ts`). It returns 401 without a session, 403 for the wrong role, a turned-off
   account, or a write without a same-site `Origin`. The acting user is `g.user` — never read a
   `userId` from the body. Sellers never receive or set cost prices.
1. Parse JSON in its own `try` → 400 "Invalid JSON body".
2. Validate every field: required, type, length, range, allowed values. (Hand-written today;
   zod planned — when it lands, one schema per route, shared with the form.)
3. Multi-row writes: `const client = await pool.connect()` → `BEGIN` → writes → `activity_log`
   → `COMMIT`; on error `ROLLBACK`, undo written files, `client.release()` in `finally`.
4. Single statements: `query()` from `lib/db.ts`.
5. SQL always parameterised; return camelCase via `AS "camelName"`.
6. Log the error server-side only in development; respond with a generic 500 sentence.
   Never return `error.message` from Postgres (`auth/sync-user` does today — don't copy).

## 3. No tooling routes

Schema changes and seed data never go through API routes — use `db/schema.ts` + migrations and
`db/seeds/` (the old `/api/seed` and `/api/migrate` were retired). A dev-only page or route must
return 404/403 unless `NODE_ENV === "development"` (see `app/kit/page.tsx`).

## 4. Permissions (docs/plans/auth.md)

| Route | Signed-in seller | Owner |
|---|---|---|
| GET lookups, GET item | ✓ (item without `costPrice`) | ✓ |
| POST item-types (from Add Item) | ✓ | ✓ |
| POST other lookups, PATCH / DELETE any lookup | 403 | ✓ |
| POST items | ✓ (cost prices dropped) | ✓ |
| /api/auth/admin/* (staff) | 403 | ✓ |

Lookup routes share `lib/lookups.ts` — add a list by binding a config, not by copying a route.

## 5. Tests

Every route gets Vitest tests in `tests/api/` (fakes in `tests/helpers.ts`): no session → 401
with no SQL run, wrong role → 403, cross-site write → 403, body `userId` ignored, plus the happy
path. Run `npm test` in `madhurya-vastra/`.
