"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { DayWithEvents, PickableUser } from "@/lib/db/itinerary";
import { computeDisplayedTimings, isEventPast } from "@/lib/domain/delays";
import { Button } from "@/components/ui/button";
import { DaySection } from "./day-section";
import { EventTimelineRow } from "./event-timeline-row";
import { useNowMinute } from "./use-now";

// The whole itinerary list. Owns the single minute clock and the past/upcoming
// split so a day's past events can be lifted out of the day card and collected
// into one page-level collapsible at the top.
export function ItineraryView({
  days,
  users,
  blocks,
}: {
  days: DayWithEvents[];
  users: PickableUser[];
  blocks: string[];
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
    <div className="mt-4 flex flex-col gap-3.5">
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
            <div className="mt-1 flex flex-col gap-3">
              {perDay
                .filter((d) => d.past.length > 0)
                .map(({ day, timings, past }) => (
                  <div key={day.id}>
                    <p className="text-muted-foreground mb-1 px-2 text-[11px] tracking-[0.12em] uppercase">
                      {day.label} ({day.date})
                    </p>
                    <ol className="flex flex-col">
                      {past.map((ev) => (
                        <EventTimelineRow
                          key={ev.id}
                          ev={ev}
                          timing={timings.get(ev.id)}
                          dayId={day.id}
                          dayDate={day.date}
                          users={users}
                          blocks={blocks}
                        />
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Days with at least one upcoming/current event. */}
      {perDay
        .filter((d) => d.upcoming.length > 0)
        .map(({ day, timings, upcoming }) => (
          <DaySection
            key={day.id}
            day={day}
            users={users}
            blocks={blocks}
            events={upcoming}
            timings={timings}
          />
        ))}
    </div>
  );
}
