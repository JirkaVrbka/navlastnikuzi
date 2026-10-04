# NaVlastniKuzi — Claude Code Instructions

## Project Overview

NaVlastniKuzi is a Czech-language web app for **organizers** of a _Traitors_-style LARP game to run the event:
a delay-aware **itinerary**, a **players overview** (status, notes, drop-out order), and a real-time
**voting tracker**. Only organizers use it — players have no access. The UI is in **Czech**. Maturity:
**prototype/MVP**.

## Tech Stack

| Layer            | Choice                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Language/Runtime | TypeScript on Node 22 (LTS)                                                                       |
| Framework        | Next.js 16 (App Router)                                                                           |
| UI framework     | React 19                                                                                          |
| UI components    | **shadcn/ui** (https://ui.shadcn.com/) on Tailwind CSS v4; **Motion** for list/reorder animations |
| Database + ORM   | Supabase **Postgres** + **Drizzle ORM** (drizzle-kit migrations → `lib/db/migrations`)            |
| Validation       | **Zod** (shared client/server)                                                                    |
| Auth             | **Supabase Auth** — email + password; admin-only user creation; first admin seeded                |
| Testing          | **Vitest** (unit) + **Playwright** (e2e)                                                          |
| Container        | **Supabase CLI (Docker)** for the local dev stack                                                 |

## Repository Structure

```
app/                  # Next.js App Router (routes, layouts). Czech route names.
  (feature routes itinerar/ hraci/ hlasovani/ are added in their roadmap phases)
components/           # shared UI; components/ui/ holds shadcn/ui components
lib/
  db/                 # Drizzle client (index.ts), schema.ts, migrations/
  domain/             # pure, testable game logic (delay math, vote/elimination rules)
  utils.ts            # shadcn cn() helper
supabase/             # Supabase CLI config (config.toml) — local stack
test/                 # Vitest unit tests + test/e2e/ (Playwright)
docs/                 # guidelines, development roadmap (this doc links out to them)
public/               # static assets
```

## Change Protocol

- Build: `npm run build` · Test: `npm test` · Lint: `npm run lint` · Types: `npm run typecheck` · Format: `npm run format`
- **Definition of done:** unit tests pass, lint clean, typecheck clean, build green — **and** the user's manual check. Nothing is "done" until all four commands pass and you've said so with evidence.
- Never leave the tree in a state where build or tests fail.

## Git Workflow

- **Claude never commits or creates branches — the user does all commits and branch creation.** Claude leaves the working tree ready for review and summarizes what changed.
- When the user commits: **Conventional Commits** (`feat|fix|docs|refactor|test|chore|perf(scope): subject`); branch prefixes `feature/ fix/ chore/ docs/ test/ refactor/`.

## How to Work With This Project

- Autonomy: **Balanced**. **Ask before:** deploys, cloud Supabase migrations, and adding any new dependency. **Proceed on:** local edits, running tests/lint/build/format, and local Supabase start/stop.
- Model policy: **strong** model for domain logic & architecture (delay propagation, voting/elimination rules); **lighter** model for mechanical edits.

## Technical Level & Decision Policy

Each contributor sets their own **technical level** (how technical I am + when I ask vs. decide). It is
personal and **not shared via git** — the active level and auto-resolved choices live in
`.claude/tech-level.local.md` (git-ignored). Level definitions: `docs/guidelines/technical-levels.md`.

- **Start of each session:** read `.claude/tech-level.local.md` and follow the active level and its
  auto-resolved decisions. If it is absent (e.g. a new contributor just cloned the repo), no level is set —
  run `/project-architect-tech-level` to have the user pick one; do not assume a level.
- **Change level:** only via `/project-architect-tech-level` (menu + confirm) — never from chat phrasing.
- **Remember a choice:** every decision I present ends with "Let me choose, and next time use the same
  choice"; picking it saves that choice (applied silently next time unless you ask to re-decide). Manage
  saved choices with `/project-architect-autoresolve`.

## Development Workflow

Every development cycle (one user assignment) MUST follow `docs/guidelines/development-workflow.md`. **The main
agent is the MANAGER, not the worker** — it plans, dispatches implement/test/validate assignments to
**subagents**, and reviews; it does **not** write or fix code itself. Cycle: clarify requirements (via
`requirements-clarity`) → plan a non-technical **assignment + plan** (tech detail scaled to the technical
level), decomposed into tasks via `writing-plans`, saved to `.claude/assignments.local/` and **confirmed with
the user** → **implement by delegating (REQUIRED SUB-SKILL: `subagent-driven-development`; `dispatching-parallel-agents`
for independent fan-out) — never inline** → verify with separate reviewer subagents (assignment fidelity,
simplification/reuse, and `requesting-code-review`) → validate (`systematic-debugging` when useful); for a new
UI feature run `design-brief` first → iterate by dispatching a fix subagent, **max 5 iterations**, then escalate
to the user. Obtain any missing skill (copy from `~/.claude/skills/`, else fetch) before the step that needs it.

## Development Roadmap

Development proceeds in phases per `docs/development/roadmap.md`, derived from
`docs/development/project-definition.md` — **one phase at a time, just-in-time**: clarify (ask if unsure) →
plan (`docs/development/plans/phase-NN-*.md`) → execute via the workflow above → mark the phase Done. Do not
pre-write later phases.

## Critical Guidelines

- **ALWAYS** verify a claim before asserting it (run it); check for an existing util/component before writing a new one.
- **ALWAYS** use **shadcn/ui** components before hand-building UI.
- **NEVER** commit secrets, modify production config, or deploy without explicit approval — env vars only, `.env*` is git-ignored.
- **NEVER** add a dependency without approval, and never one published < 14 days ago (supply-chain safety).
- **Claude NEVER commits or creates branches** — the user does.
- **Domain rules:** times are **wall-clock local** (no timezone math); a "day" has a date + label; a **delay** extends the delayed event's end and shifts all later same-day events (its start stays); vote counts never go below 0; **player status is owned by the Players feature** (voting only triggers an elimination, murders are a manual Players action).

## Guidelines

- Architecture Decisions → `See docs/guidelines/adr/README.md`
- Design proposals → `See docs/guidelines/design-proposals.md`
- Testing conventions → `See docs/guidelines/testing.md`
- PR review → `See docs/guidelines/pr-review.md`
- Development workflow → `See docs/guidelines/development-workflow.md`
- UI / design (web UI) → use the `design-brief` skill; design briefs live in `.design/`

## Guards (installed hooks)

- `validate-bash` — blocks `rm -rf`, force-push, hard-reset, `git clean -f` (suggests a safe alternative).
- `protect-files` — blocks writes to `.env*`, `*.key`/`*.pem`, `secrets.*`, or outside the project.
- `scan-secrets` — warns on hardcoded keys/tokens in a just-written file.
- `auto-format` — runs Prettier on edited files.
- `session-check` — verifies CLAUDE.md + hooks are present at session start.
- `build-check` — runs build + tests; fails if they break.

Full wiring: `.claude/settings.json`.
