# Development Workflow (per assignment)

**Every agent working on this project MUST follow this cycle for each development cycle** (one cycle = one
user assignment). Do not skip the plan/confirm step or the verification steps.

**You are the MANAGER, not the worker.** The main agent plans, dispatches assignments (implement… / test… /
validate…) to **subagents**, and reviews their results — it does **not** write or fix code itself. Divide each
cycle into small tasks and delegate them (divide-and-conquer). If a subagent fails, dispatch a **fix subagent**
— never fix manually (context pollution). Keep your own context for coordination and review.

The amount of technical detail you show scales to the user's **technical level**
(`docs/guidelines/technical-levels.md` + `.claude/tech-level.local.md`); honor auto-resolved choices.

## 1. Understand & plan — BEFORE any code
- **Clarify requirements first — run the `requirements-clarity` skill** for this assignment/phase before
  writing anything. Its clarified requirements / PRD feed the assignment below. How much you surface scales
  with the technical level (plain-language for non-programmer; full scoring/PRD for higher levels).
- **New UI feature?** If this assignment introduces a new UI feature, also run the **`design-brief`** skill for
  it before implementing (if it isn't installed, ask the user to install it; else ask its key questions inline).
  Skip for non-UI work.
- Write an **assignment**: a **non-technical** overview of what the user wants and what "done" looks like.
  This restates the request back to the user and is the checkpoint that *what you understood is what they
  actually want*. It is also the brief you will hand to the implementing sub-agent(s).
- Add a **plan** of how it will be built, in plain language, **with technicalities scaled to the user's
  technical level** (minimal for non-programmer; options + trade-offs for in-control/learning).
- Save it to `.claude/assignments.local/<NNNN>-<slug>.md` (per-user, git-ignored — see `.gitignore`).
- **Present the assignment + plan and get the user's confirmation before switching to write mode.**
- **Decompose the plan into bite-sized tasks** using the `writing-plans` skill (a `- [ ]` task list). The
  implement step iterates over these tasks — without a task list the delegation loop has nothing to hand out
  and you will fall back to doing it yourself.
- If `docs/development/roadmap.md` exists, an assignment may be the **next roadmap phase** — follow that
  file's per-phase process (clarify → plan → execute), **one phase at a time**, never pre-writing later phases.

## 2. Implement (write mode) — only after the plan is confirmed — DELEGATE, don't do it yourself
- **REQUIRED SUB-SKILL: Use `subagent-driven-development`** (invoke it via the Skill tool) to implement the
  plan **task-by-task**: it dispatches a fresh implementer subagent per task, then runs its spec-compliance and
  code-quality review gates. **Do NOT implement inline.** Give each subagent a self-contained brief (the task +
  the assignment context) — never make it read the plan file itself.
- When a cycle has **independent** sub-tasks (e.g. several unrelated files), use **`dispatching-parallel-agents`**
  to fan them out; otherwise keep tasks sequential (parallel implementers on shared code cause conflicts).
- The main agent stays the overseer: coordinate, review each subagent's report, keep your own context clean.
- (Fallback for platforms WITHOUT subagents only: `executing-plans` for inline execution.)

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
- Otherwise **iterate**: **dispatch a fix subagent** with specific instructions (never fix manually — context
  pollution), then re-run **step 3 (verify)** and **step 4 (validate)** against the same assignment.
- **Never exceed 5 iterations.** If after 5 iterations not everything is good, **stop and report to the
  user**: what was changed and what problems remain — and let them decide (more iterations, or handle the
  remaining problems another way).

## Required skills — obtain them if missing
This workflow uses these **required** skills: **`subagent-driven-development`** (the implement/verify loop — the
main agent delegates, task-by-task) and **`dispatching-parallel-agents`** (parallel fan-out); **`writing-plans`**
(decompose the plan into tasks); **`requirements-clarity`** (clarify step); **`requesting-code-review`** and
**`systematic-debugging`** (verify/validate). `subagent-driven-development` also relies on
`using-git-worktrees`, `test-driven-development`, and `finishing-a-development-branch` — acquire those too so it
runs without gaps. **Fallback:** on platforms WITHOUT subagent support, use `executing-plans` (inline) instead
of `subagent-driven-development`.

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
   | `subagent-driven-development`, `dispatching-parallel-agents`, `writing-plans`, `brainstorming`, `requesting-code-review`, `systematic-debugging`, `using-git-worktrees`, `test-driven-development`, `finishing-a-development-branch`, `executing-plans` | `https://github.com/obra/superpowers.git` |
   | `requirements-clarity` | `https://github.com/softaworks/agent-toolkit.git` |
   | `design-brief` — **UI-only, consent-gated** (ask before installing); path is `design-brief/` at repo ROOT, copy `cp -r /tmp/src/design-brief …` | `https://github.com/julianoczkowski/designer-skills.git` |
4. Place it in the project at `.claude/skills/<name>/` (commit it if the team should share it).

Invoke skills by name via the Skill tool (e.g. `requesting-code-review`), not by file path.
