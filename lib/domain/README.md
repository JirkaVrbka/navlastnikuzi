# Domain logic

Pure, framework- and DB-free functions that encode the game's rules. Keep them
here so they can be unit-tested (Vitest) without a browser, server, or database.

This is where the trickiest logic will live, for example:

- **Delay propagation** — given a day's events (with baseline start/end) and a
  set of delay entries, compute each event's displayed start/end. Rule: a delay
  extends the delayed event's end and shifts all later same-day events; the
  delayed event's start stays. Delays stack on the baseline; late starts are
  modeled by editing the baseline instead.
- **Voting / elimination** — compute vote tallies (never below 0), determine the
  eliminee at vote-end, and the drop-out ordering. Player status is owned by the
  Players feature; voting only triggers an update.

Each function gets behaviour-named tests (see `docs/guidelines/testing.md`).
Nothing here should import React, Next, or the DB client.
