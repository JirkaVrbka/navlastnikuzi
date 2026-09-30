# Project Definition

The durable definition of what this project is and aims to be — the source the development roadmap
(`roadmap.md`) is derived from. Update it when scope changes; keep it the single source of the "what / why".

## Purpose

NaVlastniKuzi is a Czech-language web app that lets the **organizers** of a _Traitors_-style LARP run the
game: keep a delay-aware itinerary, track players and who has dropped out, and record voting rounds in real
time. It replaces ad-hoc spreadsheets/paper during a live event.

## Target users

Event **organizers only** (a small trusted group). Players do **not** have accounts or access. All organizers
can create, edit, and delay events, manage players, and run votings. One **admin** user can create other
users.

## Scope

**In scope (v1):**

- Auth: email + password login; admin-only user creation; first admin seeded. Organizer-only access.
- **Itinerary:** multiple days (each with a date + label); events per day with start/end time, location,
  organizers (free text and/or link to a user), items, and a note. Timeline view → click event for editable
  detail. Per-event **delay** (15/30/45/60 min presets + custom minutes), removable; a delay extends the
  event's end and shifts all later same-day events (its start stays). Displayed time = baseline + sum of prior
  same-day delays.
- **Players overview:** picture, name, nickname, multiple separate notes, in-game status; when out, the reason
  (killed by traitors / voted out) and an automatic drop-out order counter.
- **Voting tracker:** create a voting from all still-in players; ±1 vote buttons per player (never below 0);
  sort by nickname or by votes with animated reordering; end a voting → organizer picks who is eliminated →
  archive as read-only. History + real-time tracking.
- Runs online (Vercel + hosted Supabase) and locally (Supabase CLI/Docker) via env config.

**Out of scope (for now):**

- **MCP / chatbot** integration to create/update the itinerary — deferred to a later phase (built on a stable
  itinerary API).
- Real-time sync for the itinerary (v1 real-time is limited to the voting tracker; itinerary can
  refresh-on-focus first).
- Any player-facing access, mobile app, or i18n beyond Czech.
- Shadow accounts (dropped — organizers without a login are represented as free text).

## Features

The capabilities the project should have — the raw material the roadmap turns into phases.

- Email+password auth, admin-seeded, admin-only user creation, organizer-only route protection.
- Days CRUD (date + label).
- Events CRUD with the fields above; timeline UI + editable detail.
- Delay entries (presets + custom), removable, with propagation across a day's later events.
- Players CRUD with multi-note, status, reason, and automatic drop-out ordering; manual "murder" elimination.
- Votings: build from active players, ±votes, dual sort with animated transitions, end→eliminate→archive,
  history, real-time.
- Later: MCP server exposing itinerary create/update.

## Constraints

- **Tech (mandated):** TypeScript, Next.js (App Router), React, Tailwind + shadcn/ui, Motion, Supabase
  Postgres + Drizzle, Supabase Auth, Zod, Vitest + Playwright. Hosting: Vercel + Supabase.
- **UI language:** Czech.
- **Times:** wall-clock local, no timezone math.
- **Data integrity:** player status has a single owner (Players); voting triggers but does not own it.
- **Concurrency:** multiple organizers act at once — prefer append-only/atomic writes (delays, votes) over
  read-modify-write.
- **Process:** prototype/MVP; the user owns all git commits/branches; no deploys or cloud migrations without
  explicit approval.

## Success criteria

- Organizers can run a full game night from the app: build the itinerary, apply delays that ripple correctly,
  track players through elimination, and run votings end-to-end with a correct archived history.
- Delay propagation and vote/elimination logic are covered by unit tests; the risky flows have e2e tests.
- Works both on localhost (local Supabase) and deployed on Vercel + hosted Supabase.
