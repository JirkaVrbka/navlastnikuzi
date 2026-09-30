---
description: View or edit YOUR list of auto-resolved decisions (the ones I stop asking you about). Per-user, not shared via git.
argument-hint: "[list | add | remove | clear]"
---

# Manage auto-resolved decisions

Your auto-resolved decisions are **personal** and stored in `.claude/tech-level.local.md` (git-ignored — not
shared). The registry is the markdown table between `<!-- autoresolve:start -->` and `<!-- autoresolve:end -->`,
with columns `Decision / category | Saved choice`.

If `.claude/tech-level.local.md` does not exist yet, tell the user to pick a technical level first with
`/project-architect-tech-level` (that creates the file), then stop.

Based on `$ARGUMENTS` (if empty, ask which action):

- **list** — print the current entries (or "none yet").
- **add** — ask for the *decision / category* and the *saved choice*, then add or replace that row.
- **remove** — ask which decision to remove, then delete that row.
- **clear** — confirm first, then empty the table.

After any change, write the updated table back **between the markers** in `.claude/tech-level.local.md`
(keep the markers intact; don't touch the `tech-level` block).

Reminder of the behavior these rows drive: a saved decision is applied **silently** (not asked) next time —
**unless** the user explicitly asks to decide it again. Users can also add entries inline by choosing the
"Let me choose, and next time use the same choice" option that appears on every decision prompt.
