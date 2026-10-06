"use client";

import { useState, useTransition, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import type { DayWithEvents, PickableUser } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addButtonClass } from "@/lib/ui";
import { deleteDay } from "./actions";
import { DayEditForm } from "./day-edit-dialog";
import { EventForm } from "./event-form";
import { dismissibleOnlyByButton } from "./dialog-dismiss";

type View = "menu" | "add" | "edit" | "confirmDelete";

const titleForView: Record<View, string> = {
  menu: "Možnosti dne",
  add: "Nová událost",
  edit: "Upravit den",
  confirmDelete: "Smazat den",
};

// Single cog-triggered dialog gathering a day's three actions:
// add event, edit the day, and delete the day (with an in-modal confirm step).
export function DaySettingsDialog({
  day,
  users,
}: {
  day: DayWithEvents;
  users: PickableUser[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [pending, start] = useTransition();
  const router = useRouter();

  // Closing always returns the dialog to its menu for the next open.
  function wrappedSetOpen(next: SetStateAction<boolean>) {
    const nextOpen = typeof next === "function" ? next(open) : next;
    setOpen(nextOpen);
    if (!nextOpen) setView("menu");
  }

  function handleSuccess() {
    router.refresh();
    setOpen(false);
    setView("menu");
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="size-11"
        aria-label="Nastavení dne"
        onClick={() => {
          setView("menu");
          setOpen(true);
        }}
      >
        <Settings />
      </Button>
      <Dialog
        open={open}
        onOpenChange={dismissibleOnlyByButton(wrappedSetOpen)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{titleForView[view]}</DialogTitle>
          </DialogHeader>

          {view === "menu" ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={addButtonClass}
                onClick={() => setView("add")}
              >
                + Přidat událost
              </button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setView("edit")}
              >
                Upravit den
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setView("confirmDelete")}
              >
                Smazat den
              </Button>
            </div>
          ) : null}

          {view === "add" ? (
            <div className="max-h-[70vh] overflow-auto">
              <EventForm
                dayId={day.id}
                dayDate={day.date}
                users={users}
                onSuccess={handleSuccess}
              />
            </div>
          ) : null}

          {view === "edit" ? (
            <DayEditForm day={day} onSuccess={handleSuccess} />
          ) : null}

          {view === "confirmDelete" ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm">Opravdu smazat den i jeho události?</p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView("menu")}
                >
                  Zrušit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const fd = new FormData();
                      fd.set("id", day.id);
                      await deleteDay(fd);
                      router.refresh();
                      setOpen(false);
                    });
                  }}
                >
                  Smazat
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
