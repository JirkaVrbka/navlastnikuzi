// Delay propagation — pure, framework/DB-free game logic.
//
// Rule: a delay extends the delayed event's END and shifts every LATER same-day
// event; the delayed event's START stays. Delays stack. So for a day's events,
// ordered by baseline start, with `shiftBefore` = the summed delays of earlier
// events:
//   displayedStart = startsAt + shiftBefore
//   displayedEnd   = endsAt   + shiftBefore + ownDelay
//
// Times are naive local wall-clock strings ("YYYY-MM-DDTHH:mm" or the Postgres
// "YYYY-MM-DD HH:mm:ss"); math is done in UTC to avoid any timezone drift.

// Parses to minute granularity (seconds, if present in the Postgres format, are
// intentionally dropped — the itinerary is minute-based and output is HH:mm).
function parseTs(s: string): Date {
  const [datePart, timePart = "00:00"] = s.replace("T", " ").split(" ");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh, mm));
}

function formatTs(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}` +
    `T${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`
  );
}

// Is `now16` within [displayedStart, displayedEnd)? Start inclusive, end
// exclusive. `start`/`end` may be in either the `T` or Postgres space format;
// both sides are normalized to "YYYY-MM-DDTHH:mm" before comparing. Pure — the
// caller supplies `now16` (null when the clock hasn't mounted yet → not running).
export function isEventRunning(
  start: string,
  end: string,
  now16: string | null,
): boolean {
  if (!now16) return false;
  const start16 = formatTs(parseTs(start));
  const end16 = formatTs(parseTs(end));
  return start16 <= now16 && now16 < end16;
}

// Is the event already in the PAST — i.e. has its displayed `end` passed? End
// inclusive (an event is "past" the moment its end is reached, consistent with
// `isEventRunning`'s end-exclusive running), so a running event is NOT past.
// `end` may be in either the `T` or Postgres space format; it is normalized to
// "YYYY-MM-DDTHH:mm" before comparing. Pure — the caller supplies `now16` (null
// when the clock hasn't mounted yet → not past).
export function isEventPast(end: string, now16: string | null): boolean {
  if (!now16) return false;
  const end16 = formatTs(parseTs(end));
  return end16 <= now16;
}

// Add `minutes` to a naive local timestamp string; returns "YYYY-MM-DDTHH:mm".
export function addMinutes(ts: string, minutes: number): string {
  const dt = parseTs(ts);
  dt.setUTCMinutes(dt.getUTCMinutes() + minutes);
  return formatTs(dt);
}

// Duration in whole minutes between two naive local timestamps. Diffs full
// datetimes (not bare HH:mm), so a cross-midnight event (end on the next date)
// yields a positive duration. `start`/`end` may be in either the `T` or
// Postgres space format, like the other helpers.
export function durationMinutes(start: string, end: string): number {
  return (parseTs(end).getTime() - parseTs(start).getTime()) / 60000;
}

export type DelayedEvent = {
  id: string;
  startsAt: string;
  endsAt: string;
  delayMinutes: number; // this event's own total delay
};

export type DisplayedTiming = {
  id: string;
  displayedStart: string;
  displayedEnd: string;
  shiftMinutes: number; // accumulated delay of earlier events (shifts start+end)
  ownDelay: number; // this event's own delay (extends end only)
};

// Compute each event's displayed timing for one day. Input may be in any order;
// events are ordered by baseline start (ties keep input order). Returns a map
// keyed by event id.
export function computeDisplayedTimings(
  events: DelayedEvent[],
): Map<string, DisplayedTiming> {
  // Lexical compare is correct because every startsAt in one call comes from the
  // DB in the same fixed-width format (a day's events), so do not mix in
  // formatTs output here.
  const ordered = events
    .map((e, i) => ({ e, i }))
    .sort((a, b) =>
      a.e.startsAt < b.e.startsAt
        ? -1
        : a.e.startsAt > b.e.startsAt
          ? 1
          : a.i - b.i,
    )
    .map((x) => x.e);

  const result = new Map<string, DisplayedTiming>();
  let shiftBefore = 0;
  for (const e of ordered) {
    result.set(e.id, {
      id: e.id,
      displayedStart: addMinutes(e.startsAt, shiftBefore),
      displayedEnd: addMinutes(e.endsAt, shiftBefore + e.delayMinutes),
      shiftMinutes: shiftBefore,
      ownDelay: e.delayMinutes,
    });
    shiftBefore += e.delayMinutes;
  }
  return result;
}
