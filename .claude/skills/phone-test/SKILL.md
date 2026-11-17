---
name: phone-test
description: >
  Load when a feature must be checked on a real phone over HTTPS — sharing to WhatsApp/Instagram,
  the camera, installing the PWA, anything a desktop browser cannot prove. Covers opening a
  Cloudflare quick tunnel to the Docker dev stack, the sign-in setting that must change, what to
  check as owner and seller, how to report, and closing the tunnel.
---

# Phone test over a tunnel — Madhurya Vastra

Phones only allow the share menu, camera and install prompt on HTTPS. A Cloudflare quick tunnel
gives the dev stack a temporary `https://….trycloudflare.com` address. No account needed.

Runs on the **user's machine** (where Docker and the phone's network are), not in a cloud
session. In a cloud session, give the user the commands and wait for their findings.

## 1. Open it

```bash
./scripts/dev-up.sh
```

```bash
cloudflared tunnel --url http://localhost:3000
```

Use the `APP_PORT` from `.env` if it is not 3000. `cloudflared` prints the HTTPS address.

## 2. Let sign-in accept the address

Sign-in (better-auth, `lib/auth/server.ts`) trusts the address in `BETTER_AUTH_URL`; with the
localhost value, signing in from the tunnel address is likely to be refused. The user sets
`BETTER_AUTH_URL=<tunnel address>` in `.env` (Claude never reads or edits `.env*`), then:

```bash
./scripts/dev-down.sh
```

```bash
./scripts/dev-up.sh
```

The address changes every time the tunnel restarts — set it again each time.

## 3. Safety

- Anyone with the address reaches the dev app. Dev data only; the dev owner password is public
  in this repo. Never tunnel a database with real shop data.
- Close the tunnel (Ctrl+C) when done and put `BETTER_AUTH_URL` back.

## 4. What to check

Take the list from the feature's acceptance table: every row marked "not verified" or "met in a
stand-in". Always include:

- **Both roles.** Owner (dev sign-in in CLAUDE.md) and a seller — add one on /staff first.
- **Both phones if available** (Android Chrome, iPhone Safari); they differ most on sharing.
- Portrait and landscape; light and dark.
- The real target app, end to end (e.g. the photo and caption actually arrive in WhatsApp).

## 5. Report and fix

The user reports each finding as: phone + browser, role, screen, what they did, what happened,
what they expected, screenshot if possible. Then:

1. Each finding gets a test that reproduces it where one is possible, then the fix — one commit
   per finding.
2. Update the feature's acceptance table: met / not met / not verified, with "real phone" as how
   it was checked.
3. A finding outside the feature is reported, not silently fixed (rules §1.5).

If a step here turns out wrong on a real run, fix this file — not just the session.
