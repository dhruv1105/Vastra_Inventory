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

## 4. Known gaps — do not copy into new routes

- **`userId` comes from the request body.** Until real auth lands, keep the existing pattern
  for consistency but mark new routes `// TODO(auth): take user from session`. When Auth.js/
  better-auth lands, one helper (`requireUser(role?)`) replaces it everywhere.
- **No role checks.** Same — planned with auth.
- **`sync-user` defaults to `owner`.** Never default a new user to a privileged role.
- **Four near-identical lookup route sets** (`lookups/{item-types,colors,occasions,tags}`).
  A fifth lookup should prompt one shared helper rather than another copy — ask first.
