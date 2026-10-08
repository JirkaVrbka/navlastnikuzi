"use client";

import type {
  DayWithEvents,
  EventWithRelations,
  ExistingType,
  PickableUser,
} from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { isEventRunning } from "@/lib/domain/delays";
import { DayBar } from "./day-bar";
import { DaySettingsDialog } from "./day-settings-dialog";
import { JumpNowButton } from "./jump-now-button";
import { TimelineList } from "./timeline-list";

// One day on the itinerary: the sticky day bar (label + date, settings cog, and a
// "↓ Teď" jump when this day holds the running event) over the shared timeline
// rail. Now/past classification and timing computation live in the parent
// (`ItineraryView`); this component just renders what it is given plus the live
// `now16` minute it threads down to the rail.
export function DaySection({
  day,
  users,
  props,
  blocks,
  types,
  events,
  timings,
  now16,
  isAdmin = false,
}: {
  day: DayWithEvents;
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  events: EventWithRelations[];
  timings: Map<string, DisplayedTiming>;
  now16: string | null;
  isAdmin?: boolean;
}) {
  const hasRunning = events.some((ev) => {
    const t = timings.get(ev.id);
    return isEventRunning(
      t?.displayedStart ?? ev.startsAt,
      t?.displayedEnd ?? ev.endsAt,
      now16,
    );
  });

  return (
    <section>
      <DayBar label={day.label} date={day.date}>
        {hasRunning ? <JumpNowButton targetId="itinerar-now" /> : null}
        {isAdmin && (
          <DaySettingsDialog
            day={day}
            users={users}
            props={props}
            blocks={blocks}
            types={types}
          />
        )}
      </DayBar>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné události.</p>
      ) : (
        <TimelineList
          events={events}
          timings={timings}
          now16={now16}
          dayId={day.id}
          dayDate={day.date}
          users={users}
          props={props}
          blocks={blocks}
          types={types}
          nowId="itinerar-now"
          isAdmin={isAdmin}
        />
      )}
    </section>
  );
}
