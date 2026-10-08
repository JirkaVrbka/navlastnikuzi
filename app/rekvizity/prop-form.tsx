"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createProp, updateProp, deleteProp } from "./actions";
import { initialPropFormState } from "./types";
import type { Prop } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
          {label}
        </span>
        {children}
      </label>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

export function PropForm({
  prop,
  onSuccess,
}: {
  prop?: Prop;
  onSuccess: () => void;
}) {
  const action = prop ? updateProp : createProp;
  const [state, formAction, pending] = useActionState(
    action,
    initialPropFormState,
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  const fe = state.fieldErrors ?? {};

  // Controlled fields so a failed submit keeps what the user entered.
  const [name, setName] = useState(prop?.name ?? "");
  const [count, setCount] = useState(String(prop?.count ?? 0));
  const [haveIt, setHaveIt] = useState(prop?.haveIt ?? false);
  const [note, setNote] = useState(prop?.note ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {prop ? <input type="hidden" name="id" value={prop.id} /> : null}

      <Field label="Název" error={fe.name}>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fe.name)}
        />
      </Field>

      <Field label="Počet" error={fe.count}>
        <Input
          name="count"
          type="number"
          min="0"
          inputMode="numeric"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          aria-invalid={Boolean(fe.count)}
        />
      </Field>

      <div className="flex flex-col gap-1 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
          <Checkbox
            name="haveIt"
            checked={haveIt}
            onCheckedChange={(checked) => setHaveIt(checked === true)}
          />
          <span className="text-foreground">Máme tuto rekvizitu</span>
        </label>
      </div>

      <Field label="Poznámka" error={fe.note}>
        <Textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={Boolean(fe.note)}
        />
      </Field>

      {state.formError ? (
        <p className="text-destructive text-sm" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        {prop ? <DeletePropButton id={prop.id} onDone={onSuccess} /> : <span />}
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : prop ? "Uložit" : "Vytvořit"}
        </Button>
      </div>
    </form>
  );
}

function DeletePropButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Opravdu smazat rekvizitu?")) return;
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          await deleteProp(fd);
          onDone();
        });
      }}
    >
      Smazat
    </Button>
  );
}
