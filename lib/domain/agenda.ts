// "My upcoming agenda" selection — pure, framework/DB-free.
//
// Given all days+events and the signed-in organizer's profile id, returns the
// days (in order) that still hold at least one of my events that is today or
// later. Delay-shifted display times are computed per day over the FULL event
// set (not the filtered subset) so cross-event shift stays correct, then each
// kept event carries its own displayed timing.

import type { DayWithEvents, EventWithRelations } from "@/lib/db/itinerary";
import {
  computeDisplayedTimings,
  type DisplayedTiming,
} from "@/lib/domain/delays";

export type AgendaEvent = {
  ev: EventWithRelations;
  timing: DisplayedTiming | undefined;
};

export type AgendaGroup = {
  day: DayWithEvents;
  events: AgendaEvent[];
};

// Normalize either "YYYY-MM-DD HH:mm:ss" (Postgres endsAt) or
// "YYYY-MM-DDTHH:mm" (computeDisplayedTimings output) to "YYYY-MM-DDTHH:mm" so
// full datetimes compare lexicographically (ISO-like zero-padding = chronology).
function toMinuteDT(v: string): string {
  return v.replace(" ", "T").slice(0, 16);
}

// Local wall-clock "YYYY-MM-DD" + "HH:mm" for `now`. Deliberately uses the
// local getters (not toISOString, which is UTC) to match the naive local times
// stored on events.
function localParts(now: Date): { todayStr: string; nowHM: string } {
  const p = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const nowHM = `${p(now.getHours())}:${p(now.getMinutes())}`;
  return { todayStr, nowHM };
}

export function selectMyUpcomingAgenda(
  days: DayWithEvents[],
  profileId: string,
  now: Date,
): AgendaGroup[] {
  const { todayStr, nowHM } = localParts(now);
  const now16 = `${todayStr}T${nowHM}`;
  const groups: AgendaGroup[] = [];

  for (const day of days) {
    // Timings over ALL of the day's events so cross-event delay shift is right.
    const timings = computeDisplayedTimings(
      day.events.map((e) => ({
        id: e.id,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        delayMinutes: e.delays.reduce((sum, d) => sum + d.minutes, 0),
      })),
    );

    const events: AgendaEvent[] = [];
    for (const ev of day.events) {
      const mine = ev.organizers.some((o) => o.profileId === profileId);
      if (!mine) continue;

      // Keep an event only while it has not yet ended. Comparing the FULL
      // displayed-end datetime (not just HH:mm) means a delay that rolls the end
      // past midnight stays visible, and past days drop out on their own — so a
      // single compare covers past / today / future with no per-day branching.
      const timing = timings.get(ev.id);
      const endDT = toMinuteDT(timing?.displayedEnd ?? ev.endsAt);
      if (endDT < now16) continue;

      events.push({ ev, timing });
    }

    if (events.length > 0) groups.push({ day, events });
  }

  return groups;
}
