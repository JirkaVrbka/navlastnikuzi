"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import type {
  DayWithEvents,
  ExistingType,
  PickableUser,
} from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import { computeDisplayedTimings, isEventPast } from "@/lib/domain/delays";
import { Button } from "@/components/ui/button";
import { DaySection } from "./day-section";
import { TimelineList } from "./timeline-list";
import { useNowMinute } from "./use-now";

// The whole itinerary list. Owns the single minute clock and the past/upcoming
// split so a day's past events can be lifted out of the day card and collected
// into one page-level collapsible at the top.
export function ItineraryView({
  days,
  users,
  props,
  blocks,
  types,
  today,
  isAdmin = false,
}: {
  days: DayWithEvents[];
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  // Server wall-clock date ("YYYY-MM-DD") so an empty day's past/future test
  // matches on both SSR and client (no hydration mismatch).
  today: string;
  isAdmin?: boolean;
}) {
  const now = useNowMinute();
  const [showPast, setShowPast] = useState(false);

  // Per day: displayed (delay-shifted) timings + a past/upcoming split by the
  // displayed end. On first render `now` is null → nothing is past → everything
  // renders as upcoming (no collapsible), matching SSR and avoiding a hydration
  // mismatch; after mount the past events move into the top collapsible. Order
  // is preserved within each group.
  const perDay = days.map((day) => {
    const timings = computeDisplayedTimings(
      day.events.map((e) => ({
        id: e.id,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        delayMinutes: e.delays.reduce((sum, d) => sum + d.minutes, 0),
      })),
    );
    const past = day.events.filter((ev) =>
      isEventPast(timings.get(ev.id)?.displayedEnd ?? ev.endsAt, now),
    );
    const upcoming = day.events.filter(
      (ev) => !isEventPast(timings.get(ev.id)?.displayedEnd ?? ev.endsAt, now),
    );
    return { day, timings, past, upcoming };
  });

  const totalPast = perDay.reduce((sum, d) => sum + d.past.length, 0);

  return (
    <div className="mt-4 flex flex-col gap-5">
      {/* All past events across days, collapsed by default, grouped by day. */}
      {totalPast > 0 && (
        <div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="text-muted-foreground min-h-11 w-full justify-between px-2"
          >
            <span>Uplynulé události ({totalPast})</span>
            <ChevronRight
              className={cn("transition-transform", showPast && "rotate-90")}
              aria-hidden
            />
          </Button>
          {showPast && (
            <div className="mt-1 flex flex-col gap-4">
              {perDay
                .filter((d) => d.past.length > 0)
                .map(({ day, timings, past }) => (
                  <div key={day.id}>
                    <p className="text-muted-foreground mb-1 px-2 text-[11px] tracking-[0.12em] uppercase">
                      {day.label} ({day.date})
                    </p>
                    <TimelineList
                      events={past}
                      timings={timings}
                      now16={now}
                      dayId={day.id}
                      dayDate={day.date}
                      users={users}
                      props={props}
                      blocks={blocks}
                      types={types}
                      isAdmin={isAdmin}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Days with at least one upcoming/current event — plus still-empty days
          dated today or later, so a freshly created day stays actionable (its
          day bar + settings cog are the only place to add its FIRST event). A
          day whose events are all past folds into the top collapsible; an empty
          day in the past is just clutter and stays hidden. */}
      {perDay
        .filter(
          (d) =>
            d.upcoming.length > 0 ||
            (d.day.events.length === 0 && d.day.date >= today),
        )
        .map(({ day, timings, upcoming }) => (
          <DaySection
            key={day.id}
            day={day}
            users={users}
            props={props}
            blocks={blocks}
            types={types}
            events={upcoming}
            timings={timings}
            now16={now}
            isAdmin={isAdmin}
          />
        ))}
    </div>
  );
}
