---
description: Get a deeper version of a task, not a bigger one — rewrite the request first, then wait for approval
argument-hint: <the task>
---

Task: $ARGUMENTS

I want a deeper version of this task, not a bigger one. Before doing anything, answer four
questions for this project (Madhurya Vastra — read `CLAUDE.md` and `docs/brief.md` first):

1. What would a top professional in this field do here that I haven't asked for?
2. What raw source material would they start from, rather than an existing summary? Find it in
   this repo (code, schema, `docs/`, `activity_log`, the acceptance tables) or ask me for it
   (how the shop really works, photos of the shelf, a real bill).
3. What specific methods and tools would they use?
4. What check outside of you and me would prove the result is right (tests, real data, a real
   phone, a shelf count, the owner doing it unaided)?

Then rewrite my request to ask for exactly that, show me the rewritten version, and **stop —
wait for my OK before starting**. Stay inside the roadmap step in hand: deeper means better
proof and better sources for the same scope, not extra features (rules §1.5).
