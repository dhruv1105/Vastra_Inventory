---
name: redesign-method
description: >
  Load when working on the Madhurya Vastra UI redesign (any item in docs/redesign/). Defines
  the method: audit → HTML mock as source of truth → tokens and kit first → screen by screen,
  worst first → regression screenshots. Covers the resume file, commit-per-item, behaviour
  preservation and the before/after screenshot routine.
---

# Redesign method

Modelled on a redesign that took a 63-screen admin console to one consistent kit in about a
week. What made it work: a written verdict, a mock everyone agreed on, the kit before any
screen, and a progress file that let any session resume cold.

## 1. Order — never skip ahead

1. **Audit** (done: `docs/redesign/README.md` §1 and `docs/screens.pdf`).
2. **Mock (R0).** One self-contained HTML file showing the target shell, a list screen, the
   form, an empty state and a dialog at phone and laptop width, using the proposed tokens.
   Publish it for the user to review. After approval it is the source of truth; when code and
   mock disagree, ask.
3. **Tokens + kit (R1).** No screen is restyled until the kit pieces it needs exist.
4. **Screens (R2–R5)**, in the plan's order. Each screen moves fully onto the kit in one item —
   no half-converted screens.
5. **Regression (R6).** Screenshot every screen at the four sizes; compare with the baseline.

## 2. Per item

1. Read `docs/redesign/PROGRESS.md`; take the first unchecked item.
2. Take "before" screenshots of the affected screens (`ui-snapshot` agent, 4 sizes).
3. Build. Kit first, then the screen. Delete the inline styles the kit replaces.
4. Keep behaviour: every field, validation message, button and save path works as before.
   A behaviour change needs the user's OK and goes in the summary.
5. `npx tsc --noEmit` and `npm run lint` from `madhurya-vastra/`.
6. "After" screenshots; check no horizontal scroll, focus visible, states (empty, loading,
   error) look intended.
7. Commit with the item id: `R3: Manage Lists on the kit — ConfirmDialog for delete`.
8. Tick the item in `PROGRESS.md` and add one log line (what changed, anything left).

## 3. Large files

Split before restyling. `app/(protected)/items/new/page.tsx` (474 lines) becomes section
components under `components/items/` in a no-visual-change commit (R4.1) — so the restyle
diff is readable and behaviour is easy to verify.

## 4. Out of scope during the redesign

Auth, DB schema, API shape, new features (inventory list, sales). Note ideas in the PROGRESS
log under "Later" instead of building them.
