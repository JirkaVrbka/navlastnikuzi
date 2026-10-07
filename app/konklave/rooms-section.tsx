"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { RoomRow } from "@/lib/db/konklave";
import { createRoom, deleteRoom } from "./actions";
import { initialActionState } from "./types";
import { addButtonClass } from "@/lib/ui";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import { Pill } from "@/app/itinerar/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const captionClass =
  "text-muted-foreground text-[11px] tracking-[0.12em] uppercase";

// Create a room name. Used by the "Nová místnost" dialog (createRoom).
// Resets the form + calls onSuccess once the action reports success.
function RoomForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(
    createRoom,
    initialActionState,
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      ref.current?.reset();
      onSuccess();
    }
  }, [state.success, onSuccess]);

  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-name-new" className={captionClass}>
          Název místnosti
        </Label>
        <Input
          id="room-name-new"
          name="name"
          placeholder="pokoj 432"
          required
        />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Vytvářím…" : "Vytvořit"}
      </Button>
    </form>
  );
}

// "Místnosti" section: a dashed add affordance opening a create dialog, then the
// rooms as removable pills (× deletes via deleteRoom after a confirm).
export function RoomsSection({ rooms }: { rooms: RoomRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();

  function remove(id: string) {
    if (!confirm("Opravdu smazat místnost?")) return;
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteRoom(fd);
      router.refresh();
    });
  }

  return (
    <section className="mb-6">
      <h2 className="font-display mb-2 text-lg font-semibold">Místnosti</h2>

      <button
        type="button"
        className={addButtonClass}
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="size-4" />
        Přidat místnost
      </button>
      <Dialog
        open={createOpen}
        onOpenChange={dismissibleOnlyByButton(setCreateOpen)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nová místnost</DialogTitle>
          </DialogHeader>
          <RoomForm
            onSuccess={() => {
              router.refresh();
              setCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {rooms.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          Zatím žádné místnosti. Přidejte první výše.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {rooms.map((r) => (
            <Pill key={r.id} label={r.name} onRemove={() => remove(r.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
