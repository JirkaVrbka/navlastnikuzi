"use client";

import type {
  DayWithEvents,
  EventWithRelations,
  ExistingType,
  PickableUser,
} from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { DayBar } from "./day-bar";
import { DaySettingsDialog } from "./day-settings-dialog";
import { TimelineList } from "./timeline-list";

// One day on the itinerary: the sticky day bar (label + date, settings cog) over
// the shared timeline rail. Now/past classification and timing computation live
// in the parent (`ItineraryView`); this component just renders what it is given
// plus the live `now16` minute it threads down to the rail.
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
  return (
    <section>
      <DayBar label={day.label} date={day.date}>
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
          isAdmin={isAdmin}
        />
      )}
    </section>
  );
}
