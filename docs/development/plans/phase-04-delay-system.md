# Phase 04 — Delay system

Roadmap phase 4. Derived from `docs/development/project-definition.md`. The delay model was designed up front
(see CLAUDE.md "Domain rules"). Clarified via `requirements-clarity` (2 UI decisions confirmed).

## Assignment (what "done" looks like, in plain terms)

Each event on the timeline gets a **delay button**. Tapping it opens a small popover with presets
**15 / 30 / 45 / 60 min** and a **custom** minutes field. Adding a delay **extends that event's end** and
**pushes every later same-day event's shown time**; the delayed event's **start stays**. Delays **stack** and
each entry is **individually removable**. The timeline shows the **shifted** times. Any organizer can add/remove
delays.

## Confirmed decisions

- Delay control = a **button on each event row** → popover (presets + custom + removable list).
- **Individual removable** delay entries (append-only rows; remove one at a time).

## Plan

### 1. Domain logic — `lib/domain/delays.ts` (pure, unit-tested)

- `addMinutes(ts, minutes)` — add minutes to a naive local timestamp string (UTC-based math, no tz drift).
- `computeDisplayedTimings(events)` — given each day's events with `{ id, startsAt, endsAt, delayMinutes }`,
  return per-event `{ displayedStart, displayedEnd, shiftMinutes, ownDelay }`:
  - order by baseline `startsAt`; accumulate prior delays;
  - `displayedStart = startsAt + shiftBefore`; `displayedEnd = endsAt + shiftBefore + ownDelay`.
    This is the heart of the phase — thoroughly unit-tested (single delay, multiple, ordering, midnight).

### 2. Data model — migration 0004

- **`event_delays`**: `id uuid pk`, `event_id → events(id) on delete cascade`, `minutes int not null`
  (CHECK `minutes > 0 AND minutes <= 600`), `created_at timestamptz`.
- Append-only (matches the concurrency decision — no read-modify-write of a single number).
- RLS: `FOR ALL TO authenticated` (organizers add/remove); anon blocked.
- Drizzle schema: `eventDelays` table + relations (event → many delays).
- `getDaysWithEvents` includes `delays` (ordered by createdAt).

### 3. Validation — `lib/validation/itinerary.ts`

- `delaySchema` (minutes: int 1..600).

### 4. Server actions — `app/itinerar/actions.ts`

- `addDelay(fd)` — requireUser; parse `{ eventId, minutes }`; insert a row; revalidate.
- `removeDelay(fd)` — requireUser; delete by `id`; revalidate.

### 5. UI (Czech)

- `shadcn add popover`.
- **`DelayControl`** client component (per event row): a button showing the event's own delay (e.g. "+15 min",
  or "Zpoždění" when none) → popover with preset buttons, a custom minutes input + "Přidat", and the list of
  this event's delays with × to remove.
- Restructure the timeline row in `day-section.tsx`: the event trigger (opens edit) takes the row; the
  `DelayControl` sits at the end (siblings, not nested buttons).
- Compute displayed times in `day-section` via `computeDisplayedTimings(day.events)` and render
  `hhmm(displayedStart)–hhmm(displayedEnd)`; show a small "+Nm" badge on shifted/own-delayed events.

### 6. Tests

- **Unit (domain):** `addMinutes` (incl. crossing midnight); `computeDisplayedTimings` — the canonical example
  (A delayed 15 → A.end +15, B shifts +15), stacked delays, ordering independence, a past-midnight event.
- **Unit (validation):** `delaySchema` bounds.
- **E2E:** create two events; delay the first by 15; assert its end and the second event's start shifted;
  remove the delay; assert they revert.

## Files

- `lib/domain/delays.ts` (new), `lib/validation/itinerary.ts` (edit)
- `lib/db/schema.ts` (edit), `lib/db/migrations/0004_*` (generated + raw-SQL CHECK/RLS), `lib/db/itinerary.ts` (edit)
- `app/itinerar/actions.ts` (edit), `app/itinerar/delay-control.tsx` (new), `app/itinerar/day-section.tsx` (edit)
- `components/ui/popover.tsx` (shadcn)
- `test/delays.test.ts` (new), `test/itinerary.test.ts` (edit), `test/e2e/itinerary.spec.ts` (edit)

## Verification (DoD)

- `typecheck && lint && test && build && test:e2e` green.
- Manual: add a 15-min delay to an early event → its end +15 and all later same-day events shown +15; add a
  custom delay; remove an entry → reverts; delays don't leak across days.

## Out of scope

- Real-time sync (voting is Phase 6). Players/voting. No change to auth.
