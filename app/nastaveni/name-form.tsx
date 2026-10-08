"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateName } from "./actions";
import { initialActionState } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const labelClass =
  "text-muted-foreground text-[11px] tracking-[0.14em] uppercase";

export function NameForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState(
    updateName,
    initialActionState,
  );
  const router = useRouter();

  // Refresh so the home "Přihlášen jako …" line picks up the new name.
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Jméno</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName" className={labelClass}>
              Jméno
            </Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              defaultValue={currentName}
              required
              className="h-11"
            />
          </div>

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-green text-sm" role="status">
              {state.success}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="mt-1 min-h-[48px] w-full"
          >
            {pending ? "Ukládám…" : "Uložit jméno"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
