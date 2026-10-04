"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { PlayerWithNotes } from "@/lib/db/players";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import { PlayerForm } from "./player-form";
import { PlayerView } from "./player-view";

// A clickable trigger that opens a dialog with the player's detail (read-only
// view → "Upravit" switches to the create/edit form). Mirrors EventDialog.
export function PlayerDialog({
  player,
  dropoutOrder,
  triggerClassName,
  children,
}: {
  player?: PlayerWithNotes;
  dropoutOrder?: number;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Existing players open in read-only view; "Upravit" switches to the form.
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  function onSuccess() {
    router.refresh();
    setOpen(false);
  }

  const showView = Boolean(player) && !editing;
  const title = !player ? "Nový hráč" : editing ? "Upravit hráče" : player.name;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => {
          setEditing(false); // existing players open read-only
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
            {showView && player ? (
              <PlayerView
                player={player}
                dropoutOrder={dropoutOrder}
                onEdit={() => setEditing(true)}
                onChanged={() => router.refresh()}
              />
            ) : (
              <PlayerForm player={player} onSuccess={onSuccess} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
