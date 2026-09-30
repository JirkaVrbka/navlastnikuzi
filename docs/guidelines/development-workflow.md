# Development Workflow (per assignment)

**Every agent working on this project MUST follow this cycle for each development cycle** (one cycle = one
user assignment). Do not skip the plan/confirm step or the verification steps.

The amount of technical detail you show scales to the user's **technical level**
(`docs/guidelines/technical-levels.md` + `.claude/tech-level.local.md`); honor auto-resolved choices.

## 1. Understand & plan — BEFORE any code
- **Clarify requirements first — run the `requirements-clarity` skill** for this assignment/phase before
  writing anything. Its clarified requirements / PRD feed the assignment below. How much you surface scales
  with the technical level (plain-language for non-programmer; full scoring/PRD for higher levels).
- Write an **assignment**: a **non-technical** overview of what the user wants and what "done" looks like.
  This restates the request back to the user and is the checkpoint that *what you understood is what they
  actually want*. It is also the brief you will hand to the implementing sub-agent(s).
- Add a **plan** of how it will be built, in plain language, **with technicalities scaled to the user's
  technical level** (minimal for non-programmer; options + trade-offs for in-control/learning).
- Save it to `.claude/assignments.local/<NNNN>-<slug>.md` (per-user, git-ignored — see `.gitignore`).
- **Present the assignment + plan and get the user's confirmation before switching to write mode.**
  (You may use the `writing-plans` skill to structure the plan.)
- If `docs/development/roadmap.md` exists, an assignment may be the **next roadmap phase** — follow that
  file's per-phase process (clarify → plan → execute), **one phase at a time**, never pre-writing later phases.

## 2. Implement (write mode) — only after the plan is confirmed
- Switch to write mode and dispatch **sub-agent(s)** to implement per the confirmed assignment/plan
  (see `subagent-driven-development` / `dispatching-parallel-agents`). Hand each the assignment as its brief.

## 3. Verify — with separate sub-agent(s), after implementation
Run independent checking sub-agent(s) to verify all of:
- **(a) Assignment fidelity** — the implemented work matches the assignment.
- **(b) Simplification & reuse** — can it be simplified, or use existing components for the whole or parts of
  the code instead of new code? If `docs/components.md` (the components registry) exists, consult it first as
  an **index**, then **open the linked source to confirm** it still matches before reusing; if it is missing
  or stale, scan the codebase directly. The registry is an index, **not** the source of truth.
- **(c) Code review** — invoke the `requesting-code-review` skill.

## 4. Validate the results
- Validate that it actually works (tests/build/behavior). Use the `systematic-debugging` skill whenever it
  would give better results (failures, flakiness, unexpected behavior).

## 5. Iterate if needed — hard cap of 5 iterations
- If everything is in good condition → the work is **finished**. Before declaring finished, if
  `docs/components.md` exists, update it for any shared component you added, changed (signature/purpose), or
  removed (keep links relative). Also, if `docs/development/records/` exists and the assignment was
  **substantial** (new feature/subsystem/non-trivial change — skip trivial; borderline → ask), write a
  point-in-time development record `docs/development/records/NNNN-<slug>.md` using the template in that folder's
  README, and add it to the index. Never edit an existing record. If this assignment was a roadmap phase, set
  that phase `Done` in `docs/development/roadmap.md` and link its plan.
- Otherwise **iterate**: dispatch sub-agent(s) to fix the issues, then re-run **step 3 (verify)** and
  **step 4 (validate)** against the same assignment.
- **Never exceed 5 iterations.** If after 5 iterations not everything is good, **stop and report to the
  user**: what was changed and what problems remain — and let them decide (more iterations, or handle the
  remaining problems another way).

## Required skills — obtain them if missing
This workflow uses these skills: **`requirements-clarity`** (clarify step), **`requesting-code-review`**,
**`systematic-debugging`** (and, helpfully, `writing-plans`, `subagent-driven-development`,
`dispatching-parallel-agents`).

Before a step that needs a skill, ensure it is available. If a skill is **not** already available (including as
an installed plugin, e.g. `agent-toolkit:requirements-clarity` — if so, just use that, no need to acquire):
1. Check `.claude/skills/<name>/`.
2. If missing, copy it from the user's global skills — `~/.claude/skills/<name>/` — if it exists there.
3. Otherwise fetch it from the skill's **source repo** (see the table below), where skills live at
   `skills/<name>/`. A shallow clone + copy works:
   ```bash
   git clone --depth 1 <source-repo-url> /tmp/skillsrc \
     && cp -r /tmp/skillsrc/skills/<name> "$CLAUDE_PROJECT_DIR/.claude/skills/<name>"
   ```

   | Skill(s) | Source repo |
   |---|---|
   | `requesting-code-review`, `systematic-debugging`, `writing-plans`, `subagent-driven-development`, `dispatching-parallel-agents` | `https://github.com/obra/superpowers.git` |
   | `requirements-clarity` | `https://github.com/softaworks/agent-toolkit.git` |
4. Place it in the project at `.claude/skills/<name>/` (commit it if the team should share it).

Invoke skills by name via the Skill tool (e.g. `requesting-code-review`), not by file path.
