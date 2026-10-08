"use client";

import {
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { deleteBankEntry } from "./actions";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Destructive confirm for removing a bank entry. Mirrors
// app/zpovedi/finish-confession-dialog.tsx: open state controlled by the row,
// deleteBankEntry(id) runs in a transition, errors render inline.
export function DeleteEntryDialog({
  id,
  mission,
  open,
  onOpenChange,
}: {
  id: string;
  mission: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function confirm() {
    setError("");
    start(async () => {
      const res = await deleteBankEntry(id);
      if (res.error) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  // dismissibleOnlyByButton is typed for a useState setter; it only passes a
  // boolean, so resolve any (never used) functional update to call onOpenChange.
  const openDispatch: Dispatch<SetStateAction<boolean>> = (value) =>
    onOpenChange(typeof value === "function" ? value(open) : value);

  return (
    <Dialog open={open} onOpenChange={dismissibleOnlyByButton(openDispatch)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Smazat záznam „{mission}“?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">Tuto akci nelze vrátit zpět.</p>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
              className="h-11"
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={confirm}
              className="h-11"
            >
              {pending ? "Mažu…" : "Smazat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
