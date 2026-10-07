"use client";

import { cn } from "cn";
import type { DayWithEvents, PickableUser } from "@/lib/db/itinerary";
import { Card } from "@/components/ui/card";
import { EventDialog } from "./event-dialog";
import { EventRowContent } from "./event-row-content";
import { DaySettingsDialog } from "./day-settings-dialog";
import { DelayControl } from "./delay-control";
import { computeDisplayedTimings } from "@/lib/domain/delays";

export function DaySection({
  day,
  users,
  blocks,
}: {
  day: DayWithEvents;
  users: PickableUser[];
  blocks: string[];
}) {
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
          <DaySettingsDialog day={day} users={users} blocks={blocks} />
        </div>
      </header>

      {day.events.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné události.</p>
      ) : (
        <ol className="flex flex-col">
          {day.events.map((ev) => {
            const t = timings.get(ev.id);
            const ownDelay = t?.ownDelay ?? 0;
            const delayed = ownDelay !== 0;
            // A per-event color wins for the spine; otherwise gold normally,
            // oxblood when the event carries its own delay.
            const barColor =
              ev.color ??
              (delayed ? "var(--oxblood-soft)" : "var(--line-strong)");
            return (
              <li
                key={ev.id}
                style={{ ["--event-bar" as string]: barColor }}
                className={cn(
                  // Candle-spine accent (`.event::before`): the per-event bar
                  // color, keeping the oxblood glow when the event is delayed.
                  "relative pl-3.5 before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded-sm before:bg-gradient-to-b before:from-[var(--event-bar)] before:to-transparent before:content-['']",
                  delayed && "before:shadow-[0_0_12px_rgba(160,48,54,0.5)]",
                  "[&+li]:border-border [&+li]:mt-1 [&+li]:border-t [&+li]:pt-4",
                )}
              >
                <EventDialog
                  dayId={day.id}
                  dayDate={day.date}
                  users={users}
                  blocks={blocks}
                  event={ev}
                  triggerClassName="hover:bg-muted/30 block w-full rounded-md px-2 pt-4 pb-3 text-left transition-colors"
                  tintColor={ev.color ?? undefined}
                  runningStart={t?.displayedStart ?? ev.startsAt}
                  runningEnd={t?.displayedEnd ?? ev.endsAt}
                >
                  <EventRowContent ev={ev} timing={t} />
                </EventDialog>
                {delayed && (
                  <div className="mt-2.5">
                    <DelayControl
                      eventId={ev.id}
                      delays={ev.delays}
                      ownDelay={ownDelay}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
