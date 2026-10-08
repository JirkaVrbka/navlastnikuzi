"use client";

import { useActionState, useEffect, useRef } from "react";
import { updatePassword } from "./actions";
import { initialActionState } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const labelClass =
  "text-muted-foreground text-[11px] tracking-[0.14em] uppercase";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful change.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Heslo</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className={labelClass}>
              Nové heslo
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm" className={labelClass}>
              Potvrdit heslo
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
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
            {pending ? "Měním…" : "Změnit heslo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
