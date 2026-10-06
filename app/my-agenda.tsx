import { cn } from "cn";
import type { PickableUser } from "@/lib/db/itinerary";
import type { AgendaGroup } from "@/lib/domain/agenda";
import { Card } from "@/components/ui/card";
import { EventDialog } from "./itinerar/event-dialog";
import { EventRowContent } from "./itinerar/event-row-content";

// Read-only "my upcoming events" list for the index. Mirrors the itinerary's
// timeline row look (cinematic .event rows: gold time, serif title, candle-spine
// on delayed events) but without the day-level controls (delay, edit, delete,
// add). Rows still open the same editable detail dialog.
export function MyAgenda({
  groups,
  users,
}: {
  groups: AgendaGroup[];
  users: PickableUser[];
}) {
  if (groups.length === 0) {
    return (
      <Card className="px-4 text-center">
        <p className="text-muted-foreground text-sm italic">
          Nemáš žádné nadcházející události.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {groups.map((group) => (
        <Card key={group.day.id} className="px-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-2xl leading-none font-semibold">
              {group.day.label}
            </span>
            <span className="text-muted-foreground/80 text-xs tracking-[0.08em] tabular-nums">
              ({group.day.date})
            </span>
          </div>

          <ol className="flex flex-col">
            {group.events.map(({ ev, timing }, index) => {
              const delayed = Boolean(timing && timing.shiftMinutes > 0);
              return (
                <li
                  key={ev.id}
                  className={cn(
                    index > 0 && "border-border mt-1 border-t pt-4",
                  )}
                >
                  <EventDialog
                    dayId={group.day.id}
                    dayDate={group.day.date}
                    users={users}
                    event={ev}
                    triggerClassName={cn(
                      "relative block w-full rounded-lg py-0.5 pl-3.5 text-left transition-colors hover:bg-foreground/[0.03]",
                      "before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded-[2px] before:content-['']",
                      delayed
                        ? "before:bg-[linear-gradient(var(--oxblood-soft),transparent)] before:shadow-[0_0_12px_rgba(160,48,54,0.5)]"
                        : "before:bg-[linear-gradient(var(--line-strong),transparent)]",
                    )}
                  >
                    <EventRowContent ev={ev} timing={timing} />
                  </EventDialog>
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
    </div>
  );
}
