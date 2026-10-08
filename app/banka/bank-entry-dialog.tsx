"use client";

import {
  useId,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { addBankEntry, updateBankEntry } from "./actions";
import type { BankEntryRow } from "@/lib/db/bank";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addButtonClass } from "@/lib/ui";
import { cn } from "cn";

// Shared add/edit dialog. No `entry` → add mode (dashed "+ Přidat do banky"
// trigger); an `entry` → edit mode (the row renders its own trigger and controls
// the open state). Fields map 1:1 onto the server action's typed object args;
// when potenciál is blank we OMIT `potential` (pass undefined) so the schema
// defaults it to zisk — never "" or null.
export function BankEntryDialog({
  entry,
  open: controlledOpen,
  onOpenChange,
}: {
  entry?: BankEntryRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = entry != null;
  const isControlled = controlledOpen != null;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };

  const [mission, setMission] = useState(entry?.mission ?? "");
  const [profit, setProfit] = useState(entry ? String(entry.profit) : "");
  const [potential, setPotential] = useState(
    entry && entry.potential !== entry.profit ? String(entry.potential) : "",
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const ids = useId();
  const missionId = `${ids}-mission`;
  const profitId = `${ids}-profit`;
  const potentialId = `${ids}-potential`;
  const errorId = `${ids}-error`;

  // Reset the form to the entry's values (or empty) whenever the dialog opens.
  function handleOpenChange(next: boolean) {
    if (next) {
      setError("");
      setMission(entry?.mission ?? "");
      setProfit(entry ? String(entry.profit) : "");
      setPotential(
        entry && entry.potential !== entry.profit
          ? String(entry.potential)
          : "",
      );
    }
    setOpen(next);
  }

  // dismissibleOnlyByButton is typed for a useState setter; it only ever passes
  // a boolean, so this adapter resolves any (never used) functional update.
  const openDispatch: Dispatch<SetStateAction<boolean>> = (value) =>
    handleOpenChange(typeof value === "function" ? value(open) : value);

  // Instant client-side mirror of the "potenciál ≥ zisk" rule — the server
  // remains the source of truth and its message still renders below.
  const potentialTooLow =
    potential.trim() !== "" &&
    profit.trim() !== "" &&
    Number(potential) < Number(profit);

  // Only associate the shared error with the potenciál input when the error
  // actually concerns potenciál (the client rule, or a server message about it)
  // — otherwise a mission/zisk error would mis-tag this field as invalid.
  const errorConcernsPotential = potentialTooLow || /potenciál/i.test(error);

  function submit() {
    setError("");
    const fields = {
      mission,
      profit,
      // Blank potenciál → omit entirely so the schema defaults it to zisk.
      ...(potential.trim() === "" ? {} : { potential }),
    };
    start(async () => {
      const result = isEdit
        ? await updateBankEntry(entry.id, fields)
        : await addBankEntry(fields);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {!isControlled && (
        <button
          type="button"
          className={addButtonClass}
          onClick={() => handleOpenChange(true)}
        >
          + Přidat do banky
        </button>
      )}

      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(openDispatch)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Upravit záznam" : "Nový záznam"}
            </DialogTitle>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={missionId}
                className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
              >
                Název mise
              </Label>
              <Input
                id={missionId}
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                className="h-11"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={profitId}
                className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
              >
                Zisk (Kč)
              </Label>
              <Input
                id={profitId}
                type="number"
                inputMode="numeric"
                step={1}
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                className="h-11 tabular-nums"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={potentialId}
                className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
              >
                Potenciál (Kč)
              </Label>
              <Input
                id={potentialId}
                type="number"
                inputMode="numeric"
                step={1}
                value={potential}
                onChange={(e) => setPotential(e.target.value)}
                placeholder="Nevyplněno = stejné jako zisk"
                aria-invalid={errorConcernsPotential || undefined}
                aria-describedby={errorConcernsPotential ? errorId : undefined}
                className="h-11 tabular-nums"
              />
            </div>

            {potentialTooLow ? (
              <p id={errorId} className="text-destructive text-xs" role="alert">
                Potenciál nesmí být nižší než zisk.
              </p>
            ) : error ? (
              <p id={errorId} className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
                className="h-11"
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={pending || potentialTooLow}
                className={cn("h-11", pending && "opacity-80")}
              >
                {pending ? "Ukládám…" : "Uložit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
