"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishConfession } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import { Button } from "@/components/ui/button";

// "Ukončit zpověď" → an in-modal confirm that archives the zpověď
// (finishConfession) and refreshes so it moves to the history list.
export function FinishConfessionDialog({
  confessionId,
}: {
  confessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function confirm() {
    setError("");
    start(async () => {
      const res = await finishConfession(confessionId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="from-oxblood-soft to-oxblood font-display h-auto min-h-[52px] w-full rounded-[14px] border border-[rgba(201,162,100,0.3)] bg-gradient-to-b text-[19px] font-semibold tracking-[0.06em] text-white normal-case shadow-[0_10px_30px_-12px_rgba(123,30,34,0.9)] hover:brightness-110"
      >
        Ukončit zpověď
      </Button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ukončit zpověď</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            <p>Opravdu ukončit zpověď?</p>

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
                onClick={() => setOpen(false)}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={confirm}
              >
                {pending ? "Ukončuji…" : "Ukončit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
