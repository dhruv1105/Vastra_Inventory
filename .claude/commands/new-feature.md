---
description: Start a new feature the right way — brief, plan, approval, build, verify, summary
argument-hint: <feature name or one-line idea>
---

Feature: $ARGUMENTS

Follow `.claude/rules.md`. Do the steps in order and stop at each approval point.

1. **Load context.** Read `CLAUDE.md`, `docs/brief.md`, and the skills this feature touches
   (`vastra-domain`, `api-route`, `ui-kit`).
2. **Look at the code.** Find what already exists that this feature can reuse (components, routes,
   tables). Use the `code-scout` agent for wide searches.
3. **Write the brief** (rules §1.2): who uses it and on which device, the problem, how we know it
   worked, acceptance criteria incl. edge cases (empty, no permission, invalid input, two people
   editing, large list).
4. **Write the plan**: screens, components (kit pieces reused or added), API routes, DB changes,
   steps — one commit each. List anything that changes existing behaviour.
5. **STOP — ask the user to approve the brief and plan.** Ask about anything unclear.
6. **Build step by step.** After each step: `npx tsc --noEmit` (use `checker`), commit with a
   message that says why.
7. **Verify in the running app** as each role that can reach it, at phone and laptop size
   (`ui-snapshot`).
8. **Summary:** what changed, API/DB changes, user-visible behaviour changes, anything not
   verified, and each acceptance criterion as met / not met / not verified.
