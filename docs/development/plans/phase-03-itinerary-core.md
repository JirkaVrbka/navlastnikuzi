# Phase 03 — Itinerary core

Roadmap phase 3. Derived from `docs/development/project-definition.md`. Clarified via
`requirements-clarity` (4 decisions confirmed). **Delays are Phase 4 — not in scope here.**

## Assignment (what "done" looks like, in plain terms)

Organizers can build the itinerary: create **days** (a date + a label like "Den 1"), and within each day add
**events** (e.g. Snídaně, Mise 1) with a start/end time, location, organizers, items, and a note. The day's
events show as a **timeline** ordered by start time. Clicking an event opens a **dialog** showing its full
detail, where any authenticated organizer can **edit** or **delete** it. Days can be edited/deleted too.
UI in Czech. (No delay logic yet — that's Phase 4.)

### Confirmed decisions

1. Event times stored as **`timestamp` without time zone** (handles midnight-crossing; clean for Phase-4 delays).
2. Organizers via a **join table** `event_organizers` (each row = a linked user OR a free-text name).
3. Items via a **child table** `event_items` (one row per item, ordered).
4. Event detail + editing happens in a **dialog/modal**.

## Plan (how it's built)

### 1. Data model — migration 0002 (Drizzle + raw SQL for RLS)

- **`days`**: `id uuid pk`, `date date not null`, `label text not null`, `created_at timestamptz`.
- **`events`**: `id uuid pk`, `day_id → days(id) on delete cascade`, `title text not null`,
  `starts_at timestamp not null`, `ends_at timestamp not null`, `location text`, `note text`, `created_at`.
  CHECK `ends_at >= starts_at`.
- **`event_items`**: `id uuid pk`, `event_id → events(id) on delete cascade`, `content text not null`,
  `position int not null default 0`, `created_at`.
- **`event_organizers`**: `id uuid pk`, `event_id → events(id) on delete cascade`,
  `profile_id → profiles(id) on delete set null` (nullable), `name text` (nullable), `created_at`.
  CHECK `(profile_id is not null) or (name is not null)`.
- **RLS** (raw SQL appended to the migration): enable on all four tables; policy `FOR ALL TO authenticated
USING (true) WITH CHECK (true)` — every organizer may CRUD the itinerary (matches "all organizers can
  create/edit"), while anonymous access is blocked. (The app writes via Drizzle over the direct DB connection,
  gated by `requireUser`; RLS is the baseline for any client-side access.)

### 2. Drizzle schema + queries

- Add the four tables to `lib/db/schema.ts` with relations and inferred types.
- `lib/db/itinerary.ts` — typed read helpers: `getDaysWithEvents()` (days ordered by date; events ordered by
  `starts_at`, with their items + organizers, joining `profiles` for linked-user display names).

### 3. Validation (Zod) — `lib/validation/itinerary.ts`

- `daySchema` (date: ISO date string; label: non-empty ≤100).
- `eventSchema` (title; `startsAt`/`endsAt` datetime; `endsAt >= startsAt` refine; optional location, note;
  `items: string[]`; `organizers: { profileId?: string; name?: string }[]` with a per-entry refine that one is set).

### 4. Server actions (Drizzle, `requireUser` gate)

- `app/itinerar/actions.ts`: `createDay`, `updateDay`, `deleteDay`, `createEvent`, `updateEvent`,
  `deleteEvent`. Event create/update run in a **transaction**: upsert the event row, then replace its
  `event_items` and `event_organizers` from the submitted lists. `revalidatePath('/itinerar')`.

### 5. UI (Czech, shadcn) — `/itinerar`

- `app/itinerar/page.tsx` (server): lists days (date + label), each rendering a timeline of its events
  (time range + title). "Vytvořit den" and per-day "Přidat událost".
- Event detail/edit in a **Dialog** (add `shadcn add dialog textarea checkbox`): shows all fields, editable,
  with Uložit (save) and Smazat (delete).
- **Organizer editor (pragmatic):** a checkbox list of existing users (→ linked `profile_id` rows) **plus** a
  textarea of additional free-text names, one per line (→ `name` rows). Maps cleanly to the join table.
- **Items editor:** a textarea, one item per line (→ `event_items` rows in order).
- A link to `/itinerar` from the home page.

### 6. Tests

- **Unit (Vitest):** `daySchema`/`eventSchema` (valid + invalid: bad date, end-before-start, empty organizer
  entry); the organizer/items parsing helpers (split lines → rows).
- **E2E (Playwright):** admin logs in → create a day → add an event → it appears on the timeline → open the
  dialog, edit the title/time → change reflected → delete the event → gone.

## Files (new unless noted)

- `lib/db/schema.ts` (edit), `lib/db/migrations/0002_*` (generated + raw-SQL RLS), `lib/db/itinerary.ts`
- `lib/validation/itinerary.ts`
- `app/itinerar/{page.tsx,actions.ts}` + client components (`day-form`, `event-dialog`, `event-form`, `timeline`)
- `app/page.tsx` (edit: add a link to Itinerář)
- `components/ui/{dialog,textarea,checkbox}.tsx` (shadcn)
- `test/itinerary.test.ts`, `test/e2e/itinerary.spec.ts`

## Verification (definition of done)

- `npm run typecheck && npm test && npm run build && npm run test:e2e` all green.
- Manual: create a day, add an event with items + organizers (one linked user + one free text), see it on the
  timeline, edit it in the dialog, delete it.

## Out of scope (later phases)

- **Delays** (Phase 4 — the delay button, presets, and propagation). No real-time sync. No players/voting.

## Risks / notes

- Organizer/items editors use line-based textareas + a user checkbox list to avoid heavy per-row widgets;
  revisit if UX needs richer editing.
- Event times are naive local timestamps; the UI uses `datetime-local` inputs and stores the wall-clock value.
