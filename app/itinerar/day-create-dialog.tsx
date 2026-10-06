"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayCreateForm } from "./day-create-form";
import { dismissibleOnlyByButton } from "./dialog-dismiss";

// "+ Nový den" outline button that opens the day-creation form in a modal.
export function DayCreateDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    router.refresh();
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        <Plus />
        Nový den
      </Button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nový den</DialogTitle>
          </DialogHeader>
          <DayCreateForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
