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
      className="flex flex-wrap items-end gap-3 rounded-md border p-4"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="date">Datum</Label>
        <Input id="date" name="date" type="date" required />
      </div>
      <div className="flex grow flex-col gap-1">
        <Label htmlFor="label">Název dne</Label>
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
