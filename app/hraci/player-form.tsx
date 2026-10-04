"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createPlayer, updatePlayer, deletePlayer } from "./actions";
import { initialPlayerFormState } from "./types";
import { NotesInput } from "./notes-input";
import type { PlayerWithNotes } from "@/lib/db/players";
import { publicPhotoUrl } from "@/lib/photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// A single labelled control; its error (if any) shows below.
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium">{label}</span>
        {children}
      </label>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

function Group({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

export function PlayerForm({
  player,
  onSuccess,
}: {
  player?: PlayerWithNotes;
  onSuccess: () => void;
}) {
  const action = player ? updatePlayer : createPlayer;
  const [state, formAction, pending] = useActionState(
    action,
    initialPlayerFormState,
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  const fe = state.fieldErrors ?? {};

  // Controlled fields so a failed submit keeps what the user entered. The photo
  // <input type=file> cannot be controlled, so it is left uncontrolled.
  const [name, setName] = useState(player?.name ?? "");
  const [nickname, setNickname] = useState(player?.nickname ?? "");
  const [notes, setNotes] = useState<string[]>(
    (player?.notes ?? []).map((n) => n.content),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {player ? <input type="hidden" name="id" value={player.id} /> : null}

      <Field label="Jméno" error={fe.name}>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fe.name)}
        />
      </Field>

      <Field label="Přezdívka" error={fe.nickname}>
        <Input
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          aria-invalid={Boolean(fe.nickname)}
        />
      </Field>

      <Field label="Fotka" error={fe.photo}>
        <div className="flex items-center gap-3">
          {player?.picturePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicPhotoUrl(player.picturePath)}
              alt={player.name}
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <Input
            type="file"
            name="photo"
            accept="image/*"
            className="file:text-foreground"
          />
        </div>
      </Field>

      <Group label="Poznámky">
        <NotesInput value={notes} onChange={setNotes} />
      </Group>

      {state.formError ? (
        <p className="text-destructive text-sm" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        {player ? (
          <DeletePlayerButton id={player.id} onDone={onSuccess} />
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : player ? "Uložit" : "Vytvořit"}
        </Button>
      </div>
    </form>
  );
}

function DeletePlayerButton({
  id,
  onDone,
}: {
  id: string;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Opravdu smazat hráče?")) return;
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          await deletePlayer(fd);
          onDone();
        });
      }}
    >
      Smazat
    </Button>
  );
}
