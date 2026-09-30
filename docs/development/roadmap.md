# Development Roadmap

The **init plan**: the ordered phases that build this project, derived from `project-definition.md`. Phases
are decomposed up front; each phase's detailed implementation plan is written **just-in-time**, **one at a
time** — never all at once.

## How phases work (every agent follows this)

Work on **one phase at a time**, in order. For the next `Planned` phase:

1. **Clarify** — run the `requirements-clarity` skill, and confirm the phase's goal/deliverables against
   `project-definition.md`. If anything is unclear or you are unsure, **ask the user** (depth scaled to the
   technical level; honor auto-resolved choices). If answers change scope, update `project-definition.md` and
   this roadmap before planning.
2. **Plan** — write the phase's implementation plan to `docs/development/plans/phase-NN-<slug>.md` using the
   `writing-plans` skill (use `brainstorming` first if the design is fuzzy). **Do NOT pre-write later phases.**
3. **Execute** — implement via the development workflow (`docs/guidelines/development-workflow.md`):
   assignment → sub-agents → verify → validate → iterate (≤5) → escalate.
4. **Close** — set this phase `Done` below, link its plan, then move to the next phase.

## Status legend

`Planned` · `Clarifying` · `Planning` · `In progress` · `Done` · `Blocked`

## Phases

| №   | Phase                      | Goal                             | Deliverables                                                                                                                                                                                 | Depends on | Status      | Plan                                 |
| --- | -------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | ------------------------------------ |
| 1   | Foundation & tooling       | A runnable, tested baseline      | Next.js + Tailwind + shadcn/ui + Drizzle + Supabase-local + Vitest/Playwright scaffold (done by setup); CI (lint+test+build); confirm local Supabase boots and a first migration round-trips | —          | In progress | —                                    |
| 2   | Auth & users               | Organizer-only access            | Supabase email+password login, seeded first admin, admin-only user creation, route protection, sign-out                                                                                      | 1          | Done        | [plan](plans/phase-02-auth-users.md) |
| 3   | Itinerary core             | Days + events, viewable/editable | Days CRUD (date + label); events CRUD (start/end, location, organizers as free-text/user link, items, note); timeline UI; click-to-detail editable view                                      | 2          | Planned     | —                                    |
| 4   | Delay system               | Delays that ripple correctly     | Removable delay entries (15/30/45/60 + custom); pure propagation logic in `lib/domain` with unit tests; delay UI; displayed times = baseline + prior same-day delays                         | 3          | Planned     | —                                    |
| 5   | Players overview           | Track players & elimination      | Players CRUD; picture, name, nickname, multiple notes; in-game status; reason (killed/voted out); automatic drop-out order; manual "murder" elimination                                      | 2          | Planned     | —                                    |
| 6   | Voting tracker (real-time) | Run & archive votings            | Create voting from active players; ±votes (clamped ≥0); sort by nickname/votes with animated reorder; end→pick eliminee (updates Players)→archive read-only; history; Supabase real-time     | 5          | Planned     | —                                    |
| 7   | MCP integration            | Itinerary via chatbot            | MCP server exposing itinerary create/update over a stable itinerary API; auth; client wiring                                                                                                 | 3, 4       | Planned     | —                                    |

_Deferred by decision at setup: MCP (phase 7) and itinerary real-time. Phase 1 was largely delivered by the
project-setup scaffold; remaining Phase-1 items are CI and a local-DB migration round-trip._
