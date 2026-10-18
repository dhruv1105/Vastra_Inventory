# Authentication: plan

Status: **Done (A1–A6)** · 2026-10-18 · Branch: `feat/auth` (from `redesign/r2`)

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
- **A3 done (2026-10-18).** `requireUser(request, { role })` (`lib/auth/guard.ts`) on every API
  route: 401 without a session, 403 for the wrong role / turned-off account / a write without a
  same-site Origin. `userId` removed from all request bodies; the session user is recorded. The
  four lookup route sets now share `lib/lookups.ts` (also new: activity_log entries for list
  changes, 404 instead of 500 for a malformed id). Sellers: cost price neither returned nor
  stored, Add Item hides cost and margin, Manage Lists is view-only. `/api/health` no longer
  returns database error text. Client: a 401 from the API sends the user to /login.
  Vitest 3.2.4 (Vitest 5 needs Node 22): 47 route tests in `tests/api/`. Live-checked as owner and
  seller on Postgres (statuses, created_by = real user, cost_price null for the seller's item,
  activity rows) and in the browser for both roles.
- **A4 done (2026-10-18).** Staff screen (`/staff`, account menu → Staff, owner only): list with
  role, "Turned off" and "New password pending" badges; Add person (name, mobile, optional email,
  Seller/Owner) returns a readable temporary password shown once with Copy; ⋯ menu: Reset password
  (new temporary password, signs them out everywhere), Make owner / Make seller, Turn account
  off / on — all confirmed. Rules on the server (`/api/staff`, `/api/staff/[id]`): owner only, no
  acting on yourself, always one active owner, never deleted, every change in activity_log.
  First sign-in with a temporary password shows "Choose your own to continue"; until then every
  API answers 403 "Choose a new password first." (`/api/account/password` excepted). Change
  password is in the account menu for everyone (signs out other devices). 61 Vitest tests.
  Browser-checked end to end with an owner and a new seller: add → temp password → forced change →
  app works; reset → seller's next call 401; role both ways; turned off → "This account is turned
  off…"; turned on again; staff list on a phone without horizontal scroll.
- **A5 done (2026-10-18).** Google sign-in on only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
  are set (`signInOptions()`, read at request time by the server part of the login page).
  `disableSignUp`: Google never creates accounts; first use links to the account with the same
  email (trusted provider). Google errors return to /login with a plain explanation. Setup steps in
  the README. Checked: no button without keys; with placeholder keys the button goes to
  accounts.google.com with the right client id, callback URL and account chooser; the error
  message shows. **Not verified:** a real Google round trip — needs real keys.
- **A6 done (2026-10-18).** Sign-in by text-message code: "Get a code by text message instead" on
  the login screen (shown only when an SMS provider is configured). SMS drivers behind one
  interface (`lib/auth/sms.ts`): console (development only, code in the app log) and MSG91 OTP API
  (`SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`; 10 s timeout; the code and full
  number are never logged). `sendOtpToStaff` texts only phones of active staff accounts; other
  numbers get the same response and no text. Codes last 5 minutes, 3 wrong tries invalidate the
  code, sending is limited to 3 per 5 minutes. 68 Vitest tests. Browser-checked with the console
  sender: real phone → code → signed in; unknown phone → same screen, nothing sent, code rejected;
  wrong codes → "Too many wrong codes", after which the real code no longer works.
  **Not verified:** a real MSG91 send — needs an account, DLT registration and keys.

## Left for later
- Real Google and MSG91 round trips once keys exist (A5, A6).
- Behind a proxy in production: trust its client-IP header for rate limits (see A2 note).
- Password reset by email / text without the owner (needs an email sender or OTP reset flow).
