---
description: Pick or change YOUR personal technical level (how technical I am and when I ask you to decide). Per-user, not shared via git. Menu + confirm.
---

# Change technical level

Your technical level is **personal** and stored in `.claude/tech-level.local.md` (git-ignored — not shared
with other contributors). The level definitions live in `docs/guidelines/technical-levels.md`.

When invoked, do exactly this:

1. **Load definitions.** Read the six level blocks from `docs/guidelines/technical-levels.md`.

2. **Determine current state.**
   - If `.claude/tech-level.local.md` does NOT exist → this is a **first-time selection** (skip the confirm
     step in 5).
   - Else read it and note the current level from between `<!-- tech-level:start -->` and `<!-- tech-level:end -->`.

3. **Show the menu** — all six, marking the current one if any:
   ```
   1 Non-programmer
   2 Junior developer
   3 Mid-level developer
   4 Senior developer
   5 In control of everything
   6 Learning
   ```
   Ask the user to pick a number.

4. If the pick equals the current level, say so and stop (no change).

5. **Confirm (only when changing an existing level):** show `Change level  <current> -> <picked> ?  [y/N]`
   and proceed only on an explicit affirmative. On anything else, cancel with no changes.

6. **Write** `.claude/tech-level.local.md`:
   - Put the chosen level's block between `<!-- tech-level:start -->` and `<!-- tech-level:end -->`.
   - Preserve the existing `<!-- autoresolve:start -->…<!-- autoresolve:end -->` table if the file already
     existed; if creating the file fresh, add an empty auto-resolve table (see template below).
   - Ensure `.claude/tech-level.local.md` is listed in `.gitignore` (add it if missing).

7. Confirm the change and note it applies from now on, this and future sessions, for you only.

**Never** change the level from ordinary chat — only via this command's explicit menu + confirm.

### Fresh-file template
```markdown
<!-- tech-level:start -->
<chosen level block here>
<!-- tech-level:end -->

## Auto-resolved decisions
<!-- autoresolve:start -->
| Decision / category | Saved choice |
|---|---|
| _(none yet)_ | |
<!-- autoresolve:end -->
```
