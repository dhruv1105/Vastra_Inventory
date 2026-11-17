---
description: Turn a task we keep repeating into a project skill under .claude/skills/, by interview
argument-hint: <the repeated task, e.g. "release to production">
---

Task to capture: $ARGUMENTS

Help me turn this repeated task into a Claude Code skill at `.claude/skills/<task-name>/`.

1. **Check first** that no existing skill, command or script already covers it (`.claude/skills/`,
   `.claude/commands/`, `scripts/`). If one does, propose changing that one instead.
2. **Interview me, one question at a time, and wait for each answer.** Cover: what triggers the
   task and how often; the inputs and where they come from; the exact steps in order; the
   decisions I make and my rules for them; how I tell good output from bad; the tone and format
   of the output; past mistakes and edge cases; what I check before calling it done.
3. **Only after the interview**, write `SKILL.md` in the same shape as the existing skills
   (front matter with `name` and a `description` that says when to load it), plus any scripts or
   reference files it needs. Anything in it that has not been run for real is marked as such.
4. Add the skill to the table at the bottom of `CLAUDE.md` and commit.

Whenever the skill gets something wrong later, we fix the `SKILL.md`, not just the output.
Good candidates here: release to production, weekly backup/restore check, adding a festival
caption set, a pull-request review checklist.
