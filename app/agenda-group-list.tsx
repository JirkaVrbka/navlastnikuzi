import type { ExistingType, PickableUser } from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { AgendaGroup } from "@/lib/domain/agenda";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { DayBar } from "./itinerar/day-bar";
import { TimelineList } from "./itinerar/timeline-list";

// Shared presentational rendering of agenda groups on the home screen, through
// the SAME timeline rail the itinerary uses. Upcoming groups get the sticky day
// bar (no settings cog on home); past groups pass `past` for a flat muted label
// instead. The home `now16` is a server snapshot (no live clock), threaded in so
// running/delay tags render consistently with the itinerary.
export function AgendaGroupList({
  groups,
  users,
  props,
  blocks,
  types,
  now16,
  past = false,
}: {
  groups: AgendaGroup[];
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  now16: string | null;
  past?: boolean;
}) {
  return (
    <>
      {groups.map((group) => {
        const events = group.events.map((e) => e.ev);
        const timings = new Map<string, DisplayedTiming>(
          group.events
            .filter((e) => e.timing)
            .map((e) => [e.ev.id, e.timing as DisplayedTiming]),
        );

        return (
          <section key={group.day.id}>
            {past ? (
              <p className="text-muted-foreground mb-1 px-2 text-[11px] tracking-[0.12em] uppercase">
                {group.day.label} ({group.day.date})
              </p>
            ) : (
              <DayBar label={group.day.label} date={group.day.date} />
            )}

            <TimelineList
              events={events}
              timings={timings}
              now16={now16}
              dayId={group.day.id}
              dayDate={group.day.date}
              users={users}
              props={props}
              blocks={blocks}
              types={types}
            />
          </section>
        );
      })}
    </>
  );
}
