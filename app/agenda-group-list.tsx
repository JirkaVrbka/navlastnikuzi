import type { ExistingType, PickableUser } from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { AgendaGroup } from "@/lib/domain/agenda";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { isEventRunning } from "@/lib/domain/delays";
import { DayBar } from "./itinerar/day-bar";
import { JumpNowButton } from "./itinerar/jump-now-button";
import { TimelineList } from "./itinerar/timeline-list";

// Shared presentational rendering of agenda groups on the home screen, through
// the SAME timeline rail the itinerary uses. Upcoming groups get the sticky day
// bar (no settings cog on home) and a "↓ Teď" jump when the group holds the
// running event; the past collapsible passes `past` for a flat muted label
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
        const hasRunning =
          !past &&
          group.events.some((e) =>
            isEventRunning(
              e.timing?.displayedStart ?? e.ev.startsAt,
              e.timing?.displayedEnd ?? e.ev.endsAt,
              now16,
            ),
          );

        return (
          <section key={group.day.id}>
            {past ? (
              <p className="text-muted-foreground mb-1 px-2 text-[11px] tracking-[0.12em] uppercase">
                {group.day.label} ({group.day.date})
              </p>
            ) : (
              <DayBar label={group.day.label} date={group.day.date}>
                {hasRunning ? <JumpNowButton targetId="agenda-now" /> : null}
              </DayBar>
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
              nowId={past ? undefined : "agenda-now"}
            />
          </section>
        );
      })}
    </>
  );
}
