# Authentication: plan

Status: **Approved, in progress** · 2026-10-18 · Branch: `feat/auth` (from `redesign/r2`)

## Brief

- **Who:** the owner (daily, phone + laptop) and sellers (many times a day, phone in the shop).
  Customers come in phase 2 and are out of scope here.
- **Problem:** anyone who can reach the server can add, change or delete data. Every API route
  trusts a `userId` sent by the browser, and `sync-user` makes every new user an owner. Sign-in
  is a development button; reloading a page signs you out.
- **Outcome:** only people the owner added can get in; the server, not the browser, decides who
  is acting and what they may do; staying signed in survives reloads and app restarts.

## Decisions (owner, 2026-10-18)

- Library: **better-auth**, sessions in Postgres via the Drizzle adapter.
- Sign-in methods: **phone + password**, **email + password**, **Google**, **phone OTP (SMS)**.
  Google and OTP switch on only when their keys are set (see "Needs from you").
- Accounts: **the owner adds staff** — no public sign-up. Google and OTP only sign in people who
  already have an account. The first owner is created with a one-time setup command.

## Roles (proposed — confirm)

| Action | Owner | Seller |
|---|---|---|
| Sign in, see Inventory / Sales / Dashboard | ✓ | ✓ |
| Add items (incl. new item type from Add Item) | ✓ | ✓ |
| See cost price and margin | ✓ | ✗ (hidden, not sent by the API) |
| Manage Lists (add, rename, delete) | ✓ | view only |
| Staff screen: add sellers, reset passwords, disable accounts | ✓ | ✗ |

A disabled account is signed out everywhere at once. The last active owner cannot be removed.

## Phases (one commit each; tests with each)

| # | Scope |
|---|---|
| A1 | better-auth + Drizzle schema (`user`, `session`, `account`, `verification`; our `users` table becomes the auth user table with `role`, `phone`, `disabled`), migration, `/api/auth/[...all]` route, env vars in every template, `create-owner` setup command, dev seed owner with a password |
| A2 | Login on phone + password and email + password; session-backed `AuthContext` (reload stays signed in); middleware sends signed-out visitors to /login; sign out ends the session; Cognito package, stubs and the dev bypass button removed |
| A3 | `requireUser(role?)` helper used by **every** API route; `userId` removed from all request bodies; same-origin check on writes; cost price stripped for sellers; Vitest set up with a permission-denied test per route |
| A4 | Staff screen (owner): list staff, add a seller (name, phone, optional email, temporary password), reset password, change role, disable; first sign-in with a temporary password asks for a new one |
| A5 | Google sign-in for existing accounts (matched by email), shown only when `GOOGLE_CLIENT_ID/SECRET` are set |
| A6 | Phone OTP: SMS sender interface — console sender in development, MSG91 driver for production — shown only when configured; rate-limited |

## Acceptance criteria

- Without a session, every page redirects to /login and every API route returns 401.
- A seller gets 403 on list edits and staff routes, and never receives cost price.
- Changing `userId` (or anything else) in a request body has no effect on who is recorded.
- Reloading, closing the tab or restarting Docker keeps the user signed in until sign-out or
  session expiry (30 days, renewed on use).
- Wrong password: one plain message, no hint whether the phone/email exists; repeated failures
  are rate-limited.
- Disabling a seller signs them out on their next request.
- Google / OTP: an unknown account is refused with "Ask the owner to add you".
- Works at the four device sizes, light and dark; passwords use the browser's password manager.

## Needs from you (only for A5 / A6, can come later)

- **Google:** a Google Cloud OAuth client (free). Redirect URL: `http://localhost:3000/api/auth/callback/google`
  (plus the real domain later).
- **Phone OTP:** an SMS provider account (MSG91 recommended in India) and DLT registration of
  the sender ID and OTP template. Until then OTP works in development only (code printed in logs).
- **Email reset links** need an email sender later; until then the owner resets passwords from
  the Staff screen.

## Out of scope

Customer accounts, two-factor auth, audit screen, email verification flows.

## Progress

- **A1 done (2026-10-18).** better-auth 1.7.7 (Drizzle adapter; drizzle-orm upgraded 0.36 → 0.45.3,
  drizzle-kit 0.31.11 — better-auth needs ≥ 0.45.2). `users` became the auth user table
  (cognito_sub dropped, email required — placeholder on the .invalid domain for phone-only staff;
  new columns email_verified, phone_verified, disabled*, must_change_password); new tables
  sessions, accounts, verifications (migration 0001_auth). `/api/auth/[...all]`; passwords hashed
  with Node scrypt in `lib/auth/password.mjs` (shared with the setup command); roles owner / seller
  via the admin plugin (no delete, no impersonation); SMS sender interface (console in dev);
  `scripts/create-owner.mjs` (+ `./scripts/create-owner.sh`) and a dev owner on every dev start;
  `/api/auth/sync-user` (made every user an owner) removed; production refuses to start without
  BETTER_AUTH_SECRET / BETTER_AUTH_URL (instrumentation.ts). `.npmrc legacy-peer-deps` works around
  an npm 10 crash on better-auth's optional peers. Dev image renamed `vastra-app-dev` so building
  the production image can no longer replace it.
  Verified against the stack: phone and email sign-in, 30-day httpOnly session, wrong password →
  one message, public sign-up refused, owner creates a seller, seller gets 403 on staff APIs,
  disabling ends the session and blocks sign-in, create-owner new / duplicate / reset / bad phone,
  production image sign-in. The login screen and API routes are not switched over yet (A2, A3).
- **A2 done (2026-10-18).** Login on better-auth: one "Phone number or email" field + password
  (password-manager friendly), one message for unknown account or wrong password, "Too many
  tries" on the rate limit, returns to `?next=` (same-site paths only). Session-backed
  `AuthContext` (same `useAuth()` shape: user, loading, signOut, refresh); `middleware.ts` sends
  visitors without a session cookie to /login and signed-in visitors away from it; the protected
  layout also redirects when the session is gone (expired / account turned off). Rate limits in
  Postgres (`rate_limits`, migration 0002): sign-in 5/min, OTP send 3/5 min. Removed: Cognito
  package and `lib/auth.ts`, dev bypass button (replaced by a "Fill in the test owner" helper in
  development), Cognito env vars, the unused `User` type. Google / OTP buttons removed until A5/A6.
  Browser-checked: redirect with next, wrong password, sign-in, reload and direct URLs stay signed
  in, /login redirects when signed in, menu shows name + role, sign out clears the cookie, 6th
  wrong try is rate-limited.
  **Deployment note:** behind a proxy, trust its client-IP header (better-auth
  `advanced.ipAddress.ipAddressHeaders`), otherwise every visitor shares one rate-limit bucket.
