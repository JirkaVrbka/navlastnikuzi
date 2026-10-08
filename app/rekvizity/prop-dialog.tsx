"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Prop } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import { PropForm } from "./prop-form";
import { PropView } from "./prop-view";

// A clickable trigger that opens a dialog with the prop's detail (read-only view
// → "Upravit" switches to the create/edit form). Mirrors PlayerDialog.
export function PropDialog({
  prop,
  triggerClassName,
  children,
}: {
  prop?: Prop;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Existing props open in read-only view; "Upravit" switches to the form.
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  function onSuccess() {
    router.refresh();
    setOpen(false);
  }

  const showView = Boolean(prop) && !editing;
  const title = !prop
    ? "Nová rekvizita"
    : editing
      ? "Upravit rekvizitu"
      : prop.name;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => {
          setEditing(false); // existing props open read-only
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
            {showView && prop ? (
              <PropView prop={prop} onEdit={() => setEditing(true)} />
            ) : (
              <PropForm prop={prop} onSuccess={onSuccess} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
