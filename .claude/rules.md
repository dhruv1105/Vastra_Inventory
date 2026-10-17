# Engineering rules — every feature and fix

Loaded via `CLAUDE.md`. Skills add detail; they never override these. Adapted from a larger
team's rulebook and cut down to what a one-shop app needs.

## 1. Process

1. **Plan before build.** Non-trivial work: look at the code → written plan → user approval →
   build, one step per commit. Never cross an approval point without the user.
2. **Every feature starts with a brief:** **who** uses it (owner, seller, customer; how often,
   on which device), the **problem** it removes, how we know it **worked** (fewer taps, less
   re-typing, faster billing), and **acceptance criteria** — happy path plus edge cases (empty,
   no permission, invalid input, two people editing, a list with 1,000 items).
3. **The code wins over the brief.** If they disagree, write down the conflict and ask.
4. **Reuse first.** Search `components/`, `lib/`, `hooks/` before writing anything new. Call
   the existing thing; never write a second version of it.
5. **Stay in scope.** A bug found on the way is reported, not silently fixed. If the user
   approves the fix, it gets its own commit.
6. **Stop and ask** when a change removes something, changes what stored data means, or needs
   an API/DB change on a UI task.
7. **Done means working, not compiling.** Every acceptance criterion works in the running app,
   for every role that can reach it, on phone and laptop. A button with no backend is not done.

## 2. Change safety

1. **Nothing that works today breaks.** Check before/after for every screen and route you touch.
   Anything that changes behaviour goes in the summary.
2. **One source of truth per concept.** One component per UI pattern, one table per fact.
3. **Write down what users will notice** ("Delete now asks for confirmation").
4. **Never destroy input before the next step succeeds** (e.g. keep the form data until the
   server confirms the save).

## 3. Backend correctness

1. **Validate every request on the server** — type, length, range, allowed values. SQL is always
   parameterised (`$1, $2`), never string-built.
2. **One transaction per user action** that writes several rows; on failure, roll back and undo
   any files written (see `app/api/items/route.ts`).
3. **Every state change writes `activity_log`** (who, what, which record) — metadata only, no
   personal data.
4. **Money is exact.** Integer paise or `NUMERIC` in the DB; never JavaScript float maths for
   totals. Display as `₹1,999`.
5. **Stock moves are recorded, not overwritten** (target design — see `vastra-domain`).
6. **Errors carry a plain sentence** the screen can show: `{ error: "Title is required" }`.
   Never send stack traces or DB messages to the client.
7. **Every list is paginated and bounded** once it can grow (items, sales, customers). Lookup
   lists are small and exempt.
8. **No N+1 queries.** Fetch related rows in one query; add an index for every new filter or
   foreign key on a growing table.
9. **Idempotent seeds and migrations** — running twice changes nothing.
10. **Dates:** store UTC (`timestamptz`), show IST in human words.
11. **Missing required config fails loudly** at startup or first use, with a message saying which
    variable.

## 4. Security and access

1. **Closed by default.** Every API route checks who is calling (once real auth lands). New roles
   and permissions start with nothing.
2. **Fail toward less access.** Unknown user or role → deny; never default to `owner`.
3. **The server decides who the user is** — from the session, never from a `userId` in the body.
4. **Customers never see staff data** — cost price, margins, other customers' orders.
5. **Uploads are checked**: type by content, size limit, count limit.
6. **Secrets** live in `.env.local` / the host's secret store, never in code, logs or git.
7. **No `dangerouslySetInnerHTML` on user data; no `eval`.**

## 5. Frontend and UX

1. **No machine words on screen** — no enum keys (`both`, `sold_out`), slugs or UUIDs; show a label.
2. **Say a thing once; show the normal case quietly.**
3. **Overview first, detail when asked** (drawers, expandable sections).
4. **Icon = kind of thing, colour = status.** Gold/amber = needs attention; red only when blocked
   or destructive.
5. **Time and money in human words** — "3 days ago", "₹1,999".
6. **Same thing, same word** on every screen (Item, not Product here and Item there).
7. **Fewer borders** — no card inside a card.
8. **One clear primary action per screen/row**; the rest in a ⋯ menu; delete last, confirmed in
   the shared `ConfirmDialog` — never `window.confirm`.
9. **Every empty, loading, disabled and error state says why and what next.**
10. **Everything reusable** — shared kit in `components/ui/`; pages compose kit pieces.
11. **Brand tokens only** — no raw hex, palette classes or arbitrary px values (`ui-kit` skill).
12. **Saves report the real result** — wait for the server; never a fake "Saved!".
13. **Usable by everyone, on every screen size** — keyboard reachable, visible focus, labelled
    inputs and icon buttons (`aria-label`), tap targets ≥ 44px, no horizontal scroll at
    390 / 768 / 844 / 1366 px.
14. **Built for the person in the shop.** Staff screens need the fewest taps, big targets and
    speed. Motion there is small transitions plus short, skippable intros only (`ui-kit` §5);
    rich motion belongs to the storefront (phase 2). Always respect `prefers-reduced-motion`.
15. **The brand is felt everywhere** — logo violet, Indian-feel typography and logo motifs on
    every screen, used with restraint (`ui-kit` §1–4).

## 6. Verification and reporting

1. **Type check after every change** (`npx tsc --noEmit` in `madhurya-vastra/`), lint before
   commit, `npm run build` before a phase is called done.
2. **Every fix gets a test that reproduces the bug; every feature gets tests** for the happy path
   and each edge case — once Vitest is set up. Until then, list what was checked by hand.
3. **UI changes get before/after screenshots** at the four device sizes (`ui-snapshot` agent).
4. **Commit messages explain why** — what was wrong, what the change does.
5. **Final summary lists:** what changed, any API/DB change, behaviour users will notice,
   anything not verified, and each acceptance criterion as met / not met / not verified.
