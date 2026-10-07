"use client";

import type {
  DayWithEvents,
  EventWithRelations,
  PickableUser,
} from "@/lib/db/itinerary";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { Card } from "@/components/ui/card";
import { EventTimelineRow } from "./event-timeline-row";
import { DaySettingsDialog } from "./day-settings-dialog";

// One day's card: header (label + date) with the settings cog, and an `<ol>` of
// the events the parent passes (already filtered to the upcoming/current ones
// and ordered). Now/past classification and timing computation live in the
// parent (`ItineraryView`); this component just renders what it is given.
export function DaySection({
  day,
  users,
  blocks,
  events,
  timings,
}: {
  day: DayWithEvents;
  users: PickableUser[];
  blocks: string[];
  events: EventWithRelations[];
  timings: Map<string, DisplayedTiming>;
}) {
  return (
    <Card className="gap-3.5 p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl leading-none font-semibold">
          {day.label}{" "}
          <span className="text-muted-foreground text-xs font-normal tracking-[0.08em] tabular-nums">
            ({day.date})
          </span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <DaySettingsDialog day={day} users={users} blocks={blocks} />
        </div>
      </header>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné události.</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((ev) => (
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
      )}
    </Card>
  );
}
