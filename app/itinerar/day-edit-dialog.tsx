"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateDay } from "./actions";
import { initialActionState } from "./types";
import { dismissibleOnlyByButton } from "./dialog-dismiss";
import type { DayWithEvents } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function DayEditForm({
  day,
  onSuccess,
}: {
  day: DayWithEvents;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateDay,
    initialActionState,
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={day.id} />
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor={`date-${day.id}`}
          className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
        >
          Datum
        </Label>
        <Input
          id={`date-${day.id}`}
          name="date"
          type="date"
          defaultValue={day.date}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor={`label-${day.id}`}
          className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
        >
          Název dne
        </Label>
        <Input
          id={`label-${day.id}`}
          name="label"
          defaultValue={day.label}
          required
        />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Ukládám…" : "Uložit"}
      </Button>
    </form>
  );
}

export function DayEditDialog({ day }: { day: DayWithEvents }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onSuccess() {
    router.refresh();
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Upravit
      </Button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Upravit den</DialogTitle>
          </DialogHeader>
          <DayEditForm day={day} onSuccess={onSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
