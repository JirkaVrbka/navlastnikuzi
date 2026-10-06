"use client";

import { useActionState, useEffect, useRef } from "react";
import { createDay } from "./actions";
import { initialActionState } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DayCreateForm() {
  const [state, formAction, pending] = useActionState(
    createDay,
    initialActionState,
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={ref}
      action={formAction}
      className="border-border from-card flex flex-wrap items-end gap-3 rounded-[var(--radius)] border bg-gradient-to-b to-[var(--charcoal)] p-4 shadow-[var(--shadow)]"
    >
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="date"
          className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
        >
          Datum
        </Label>
        <Input id="date" name="date" type="date" required />
      </div>
      <div className="flex grow flex-col gap-1.5">
        <Label
          htmlFor="label"
          className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase"
        >
          Název dne
        </Label>
        <Input id="label" name="label" placeholder="Den 1" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Vytvářím…" : "Vytvořit den"}
      </Button>
      {state.error ? (
        <p className="text-destructive w-full text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
