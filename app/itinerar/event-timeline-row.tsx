"use client";

import { cn } from "cn";
import type { EventWithRelations, PickableUser } from "@/lib/db/itinerary";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { EventDialog } from "./event-dialog";
import { EventRowContent } from "./event-row-content";
import { DelayControl } from "./delay-control";

// A single event row, shared identically by the upcoming day sections and the
// top "Uplynulé události" collapsible. Rendered as an `<li>` so it tiles inside
// an `<ol>`; the `[&+li]` sibling-border classes draw the separators between
// consecutive rows.
export function EventTimelineRow({
  ev,
  timing,
  dayId,
  dayDate,
  users,
  blocks,
}: {
  ev: EventWithRelations;
  timing: DisplayedTiming | undefined;
  dayId: string;
  dayDate: string;
  users: PickableUser[];
  blocks: string[];
}) {
  const ownDelay = timing?.ownDelay ?? 0;
  const delayed = ownDelay !== 0;
  // A per-event color wins for the spine; otherwise gold normally,
  // oxblood when the event carries its own delay.
  const barColor =
    ev.color ?? (delayed ? "var(--oxblood-soft)" : "var(--line-strong)");
  return (
    <li
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
        dayId={dayId}
        dayDate={dayDate}
        users={users}
        blocks={blocks}
        event={ev}
        triggerClassName="hover:bg-muted/30 block w-full rounded-md px-2 pt-4 pb-3 text-left transition-colors"
        tintColor={ev.color ?? undefined}
        runningStart={timing?.displayedStart ?? ev.startsAt}
        runningEnd={timing?.displayedEnd ?? ev.endsAt}
      >
        <EventRowContent ev={ev} timing={timing} />
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
}
