"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import type {
  EventWithRelations,
  ExistingType,
  PickableUser,
} from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "./event-form";
import { EventView } from "./event-view";
import { dismissibleOnlyByButton } from "./dialog-dismiss";

// A clickable trigger that opens a dialog containing the event create/edit form.
// The timeline row owns the running highlight and color accent; this trigger is
// just the clickable surface that opens the editable detail.
export function EventDialog({
  dayId,
  dayDate,
  users,
  props,
  blocks,
  types,
  event,
  triggerClassName,
  children,
}: {
  dayId: string;
  dayDate: string;
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  event?: EventWithRelations;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Existing events open in read-only view; "Upravit" switches to the form.
  const [editing, setEditing] = useState(false);
  const router = useRouter();

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
        className={cn(triggerClassName)}
        onClick={() => {
          setEditing(false); // existing events open read-only
          setOpen(true);
        }}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {showView && event ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <EventView event={event} onEdit={() => setEditing(true)} />
            </div>
          ) : (
            <EventForm
              dayId={dayId}
              dayDate={dayDate}
              users={users}
              props={props}
              blocks={blocks}
              types={types}
              event={event}
              onSuccess={onSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
