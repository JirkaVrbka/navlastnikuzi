# Phase 06 — Voting tracker (real-time)

Roadmap phase 6. From `docs/development/project-definition.md`. Confirmed: Supabase Realtime + atomic vote counter.

## Assignment (plain)

Organizers run voting rounds. A new voting snapshots all in-game players as candidates. Each candidate has a
vote count with +1/−1 buttons; counts never go below 0 and update **live** on every organizer's screen. The
list can be sorted by nickname or by votes, reordering with a smooth animation. Ending a voting asks who to
eliminate (default the top-voted) or nobody, then archives it read-only. Eliminating marks the player out with
reason **voted_out** (same status the Players feature owns). History of past votings is kept. Czech UI.

## Confirmed decisions

- Real-time via **Supabase Realtime** (postgres_changes on `voting_candidates`).
- Votes = **atomic counter**: `UPDATE voting_candidates SET votes = GREATEST(0, votes + delta)`.
- Candidate list is a **fixed snapshot** of in-game players at voting creation.

## Plan

### Data — migration 0008

- `votings`: `id uuid pk`, `status text not null default 'active'` CHECK `in ('active','archived')`,
  `created_at timestamptz`, `ended_at timestamptz`, `eliminated_player_id uuid references players(id) on
delete set null`.
- `voting_candidates`: `id uuid pk`, `voting_id → votings(id) on delete cascade`,
  `player_id → players(id) on delete cascade`, `votes integer not null default 0` CHECK `votes >= 0`,
  `unique (voting_id, player_id)`.
- RLS `FOR ALL TO authenticated` on both.
- Realtime (raw SQL): `alter publication supabase_realtime add table voting_candidates;` and
  `alter table voting_candidates replica identity full;` (so UPDATE payloads carry the row). Applies to dev +
  test via `db:migrate`.
- Drizzle schema: `votings`, `votingCandidates` + relations (voting → many candidates; candidate → player).

### Shared elimination helper

- Factor Phase-5 elimination into `lib/db/players.ts` `eliminatePlayerById(playerId, reason)` (sets
  `in_game=false, eliminated_at=now(), reason`, keeps `players_status_check`). Use it in BOTH
  `app/hraci/actions.ts` (existing eliminate) and the new `endVoting`.

### Domain — `lib/domain/voting.ts` (pure, unit-tested)

- `sortCandidates(list, by)` where `by ∈ {"nickname","votes"}`: votes → desc, tie by nickname; nickname →
  asc. Deterministic (final tie by id). The animated reorder uses this order.

### Actions — `app/hlasovani/actions.ts` (requireUser)

- `createVoting`: read in-game players; if none → error; insert a `votings` row + one `voting_candidates` per
  in-game player (votes 0) in a transaction.
- `castVote(candidateId, delta)` where delta ∈ {+1,-1}: atomic `UPDATE ... GREATEST(0, votes+delta)` (reject
  a cast on an archived voting — only active votings are mutable).
- `endVoting(votingId, eliminatePlayerId | null)`: set `status='archived', ended_at=now(),
eliminated_player_id`; if a player id given, call `eliminatePlayerById(id,'voted_out')`. Idempotent-ish:
  reject if already archived.

### UI — `app/hlasovani` (Czech)

- Page: a "Nové hlasování" button; the active voting (if any) as a live tally; a history list of archived
  votings (read-only tally + "Vyřazen: <jméno>" / none).
- Active tally (client component): candidates (player name/nickname/photo + votes), +1/−1 buttons, a
  sort toggle (nickname | počet hlasů). Reorder animated with `motion` (`layout` on list items / FLIP).
  - ±1: optimistic local bump, then `castVote`; a Supabase Realtime subscription (browser client, this
    voting's `voting_candidates`) is the source of truth — on an event, set that candidate's votes from the
    payload so all screens converge. Clamp display at 0.
  - "Ukončit hlasování" → dialog: pick the eliminee (default highest-votes) from the candidates, or "nikoho"
    → `endVoting`.
- Link from `app/page.tsx` (all organizers).

### Tests

- Unit `test/voting.test.ts`: `sortCandidates` (by votes desc + nickname tiebreak; by nickname; stable).
- E2E `test/e2e/voting.spec.ts` (test stack): create 2 in-game players → "Nové hlasování" → both candidates
  shown at 0 → +1 on A (count shows 1 via optimistic update) → sort by votes → A first → Ukončit → eliminate
  A → voting archived + A shown as out; open /hraci → A `Vyřazen` reason voted-out. (Single client: optimistic
  update proves the count; cross-client Realtime convergence noted, not e2e'd.)

## Verification (DoD)

- Test stack up; `npm run typecheck && lint && test && build && test:e2e` green.
- Manual (two browser windows on the dev app): +1 in one updates the other live (Realtime).

## Out of scope

- MCP (Phase 7). No change to auth/itinerary/delays beyond the shared eliminate helper.
