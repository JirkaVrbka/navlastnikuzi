"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import type { EventWithRelations, PickableUser } from "@/lib/db/itinerary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "./event-form";
import { EventView } from "./event-view";
import { dismissibleOnlyByButton } from "./dialog-dismiss";
import { useNowMinute } from "./use-now";
import { isEventRunning } from "@/lib/domain/delays";

// A clickable trigger that opens a dialog containing the event create/edit form.
export function EventDialog({
  dayId,
  dayDate,
  users,
  blocks,
  event,
  triggerClassName,
  tintColor,
  runningStart,
  runningEnd,
  children,
}: {
  dayId: string;
  dayDate: string;
  users: PickableUser[];
  blocks: string[];
  event?: EventWithRelations;
  triggerClassName?: string;
  tintColor?: string;
  runningStart?: string;
  runningEnd?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Existing events open in read-only view; "Upravit" switches to the form.
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  // Gold-ring the trigger while this event is currently running. The shared
  // minute clock renders `null` first (no highlight) to avoid a hydration
  // mismatch, then updates after mount and every ~30s.
  const now = useNowMinute();
  const running =
    runningStart && runningEnd
      ? isEventRunning(runningStart, runningEnd, now)
      : false;

  // Subtle full-row background tint of the event's own color (when set).
  const tintStyle = tintColor
    ? { backgroundColor: `color-mix(in oklab, ${tintColor} 14%, transparent)` }
    : undefined;

  // Closing the dialog unmounts the form that invoked the server action, which
  // can race with the action's own RSC refresh. Refresh explicitly from here
  // (this component stays mounted) so the timeline always reflects the change.
  function onSuccess() {
    router.refresh();
    setOpen(false);
  }

  const showView = Boolean(event) && !editing;
  const title = !event
    ? "Nová událost"
    : editing
      ? "Upravit událost"
      : event.title;

  return (
    <>
      <button
        type="button"
        style={tintStyle}
        className={cn(
          triggerClassName,
          running && "ring-gold/60 ring-1 ring-inset",
        )}
        onClick={() => {
          setEditing(false); // existing events open read-only
          setOpen(true);
        }}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            {showView && event ? (
              <EventView event={event} onEdit={() => setEditing(true)} />
            ) : (
              <EventForm
                dayId={dayId}
                dayDate={dayDate}
                users={users}
                blocks={blocks}
                event={event}
                onSuccess={onSuccess}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
