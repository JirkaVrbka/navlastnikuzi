import type { PickableUser } from "@/lib/db/itinerary";
import type { AgendaGroup } from "@/lib/domain/agenda";
import { EventDialog } from "./itinerar/event-dialog";
import { EventRowContent } from "./itinerar/event-row-content";

// Read-only "my upcoming events" list for the index. Mirrors the itinerary's
// DaySection row markup so the rows look identical and open the same editable
// detail dialog, but without the day-level controls (delay, edit, delete, add).
export function MyAgenda({
  groups,
  users,
}: {
  groups: AgendaGroup[];
  users: PickableUser[];
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nemáš žádné nadcházející události.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section
          key={group.day.id}
          className="flex flex-col gap-3 rounded-lg border p-4"
        >
          <h2 className="text-lg font-medium">
            {group.day.label}{" "}
            <span className="text-muted-foreground text-sm">
              ({group.day.date})
            </span>
          </h2>
          <ol className="flex flex-col divide-y rounded-md border">
            {group.events.map(({ ev, timing }) => (
              <li key={ev.id} className="flex items-center gap-2 pr-2">
                <EventDialog
                  dayId={group.day.id}
                  dayDate={group.day.date}
                  users={users}
                  event={ev}
                  triggerClassName="hover:bg-muted flex flex-1 items-baseline gap-3 rounded p-3 text-left"
                >
                  <EventRowContent ev={ev} timing={timing} />
                </EventDialog>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
