# Phase 05 — Players overview

Roadmap phase 5. From `docs/development/project-definition.md`. Clarified: picture via Supabase Storage.

## Assignment (plain)

A players page: each player has a photo, name, nickname, multiple separate notes, and an in-game status. When
a player drops out, record the reason (killed by traitors / voted out) and show their drop-out order (1st,
2nd, …) automatically. Organizers can add/edit/delete players, add/remove notes, eliminate a player (manual
"murder" or voted-out), and bring one back. Czech UI. (Voting auto-triggering elimination is Phase 6.)

## Confirmed decisions

- Picture: **Supabase Storage** upload (bucket `player-photos`, **public**, random object paths).
- Drop-out order is **derived** by ranking `eliminated_at` — no stored counter; bring-back nulls it.

## Plan

### Data — migration 0007

- `players`: `id uuid pk`, `name text not null`, `nickname text`, `picture_path text` (object path in the
  bucket, NOT a full URL — see Storage note), `in_game boolean not null default true`,
  `eliminated_at timestamptz`, `reason text`, `created_at`.
  - CHECK `reason IN ('killed','voted_out')` (when set).
  - CHECK status coherence: `(in_game AND eliminated_at IS NULL AND reason IS NULL) OR (NOT in_game AND
eliminated_at IS NOT NULL AND reason IS NOT NULL)`.
- `player_notes`: `id`, `player_id → players(id) on delete cascade`, `content text not null`, `created_at`.
- RLS `FOR ALL TO authenticated` on both.
- Storage: raw SQL `insert into storage.buckets (id,name,public) values ('player-photos','player-photos',true)
on conflict do nothing;` so it exists on dev + test stacks after `db:migrate`.
- Drizzle schema: `players`, `playerNotes` + relations.

### Storage — local + portable (IMPORTANT)

- Store the **object path** (e.g. `<uuid>.jpg`) in `players.picture_path`, NOT a full URL (a stored
  `http://127.0.0.1:54321/...` is env-specific and breaks on cloud).
- Build the URL at display: `publicPhotoUrl(path)` =
  `` `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/player-photos/${path}` ``. Uses the
  per-environment URL → works on the **local** stack (54321 dev / 55321 test) and on cloud unchanged. Public
  buckets serve `/object/public/...` with no read policy; upload via the service-role admin client in the
  gated action. Verify locally the `<img>` loads from `127.0.0.1:54321`.

### Domain — `lib/domain/players.ts` (pure, unit-tested)

- `computeDropoutOrder(players)`: among out players (`!in_game`), rank by `eliminated_at` asc (tie → id) →
  map `playerId → order` (1-based). In-game players absent from the map.

### Validation — `lib/validation/players.ts`

- `playerSchema` (name 1..100, nickname ≤100 optional), `noteSchema` (content 1..2000),
  `eliminateSchema` (reason enum `killed`|`voted_out`).

### Actions — `app/hraci/actions.ts` (requireUser)

- `createPlayer` / `updatePlayer` (name, nickname, optional photo `File` → upload via service-role admin
  Storage client, store public URL) / `deletePlayer`.
- `addNote` / `removeNote`.
- `eliminatePlayer` (set `in_game=false`, `eliminated_at=now()`, `reason`) / `revivePlayer` (back in game,
  null `eliminated_at`+`reason`).

### UI — `app/hraci` (Czech)

- Page lists players as cards: photo (or initials), name, nickname, status badge, drop-out order `#N` when out,
  reason, notes list. Link from home (all organizers).
- Create/edit dialog: name, nickname, photo upload (`<input type=file accept=image/*>`), notes add/remove
  (pill/list), eliminate (reason select) + bring-back.
- Reuse existing patterns: Dialog, field-error form state, `Pill`, `requireUser`, shadcn components.

### Tests

- Unit: `computeDropoutOrder` (none out; some out ordered by time; tie; revive removes from ranking);
  `playerSchema`/`eliminateSchema` bounds.
- E2E (test stack, port 3100): create player → appears; add a note → shows; eliminate with reason → status
  out + order `#1`; create+eliminate a second → `#2`; bring back first → its order clears and second becomes
  `#1`. Photo upload: exercise with a tiny fixture image (or assert the file input exists if upload is flaky
  in CI — prefer a real small upload).

## Verification (DoD)

- Test stack up (`npm run supabase:test:start`); then `npm run typecheck && lint && test && test:e2e` green.
- Manual: add players with photos, notes; eliminate/revive; drop-out order renumbers correctly.

## Out of scope

- Voting (Phase 6) — it will later call the same eliminate path with reason `voted_out`. No MCP.
