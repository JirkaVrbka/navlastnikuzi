"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import type { DayWithEvents, PickableUser } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteDay } from "./actions";
import { EventDialog } from "./event-dialog";
import { EventRowContent } from "./event-row-content";
import { DayEditDialog } from "./day-edit-dialog";
import { DelayControl } from "./delay-control";
import { computeDisplayedTimings } from "@/lib/domain/delays";
import { addButtonClass } from "@/lib/ui";

export function DaySection({
  day,
  users,
}: {
  day: DayWithEvents;
  users: PickableUser[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  // Displayed (delay-shifted) times for this day's events.
  const timings = computeDisplayedTimings(
    day.events.map((e) => ({
      id: e.id,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      delayMinutes: e.delays.reduce((sum, d) => sum + d.minutes, 0),
    })),
  );

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
          <DayEditDialog day={day} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Smazat celý den i jeho události?")) return;
              const fd = new FormData();
              fd.set("id", day.id);
              start(async () => {
                await deleteDay(fd);
                router.refresh();
              });
            }}
          >
            Smazat den
          </Button>
        </div>
      </header>

      {day.events.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné události.</p>
      ) : (
        <ol className="flex flex-col">
          {day.events.map((ev) => {
            const t = timings.get(ev.id);
            const ownDelay = t?.ownDelay ?? 0;
            const delayed = ownDelay > 0;
            return (
              <li
                key={ev.id}
                className={cn(
                  // Candle-spine accent (`.event::before`): gold gradient
                  // normally, oxblood glow when the event carries its own delay.
                  "relative pl-3.5 before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded-sm before:bg-gradient-to-b before:content-['']",
                  delayed
                    ? "before:from-[var(--oxblood-soft)] before:to-transparent before:shadow-[0_0_12px_rgba(160,48,54,0.5)]"
                    : "before:from-[var(--line-strong)] before:to-transparent",
                  "[&+li]:border-border [&+li]:mt-1 [&+li]:border-t [&+li]:pt-4",
                )}
              >
                <EventDialog
                  dayId={day.id}
                  dayDate={day.date}
                  users={users}
                  event={ev}
                  triggerClassName="hover:bg-muted/30 block w-full rounded-md py-1.5 pr-2 text-left transition-colors"
                >
                  <EventRowContent ev={ev} timing={t} />
                </EventDialog>
                <div className="mt-2.5">
                  <DelayControl
                    eventId={ev.id}
                    delays={ev.delays}
                    ownDelay={ownDelay}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <EventDialog
        dayId={day.id}
        dayDate={day.date}
        users={users}
        triggerClassName={addButtonClass}
      >
        + Přidat událost
      </EventDialog>
    </Card>
  );
}
