"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser, type CreateUserState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: CreateUserState = { error: "", success: "" };

const labelClass =
  "text-muted-foreground text-[11px] tracking-[0.14em] uppercase";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful creation.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Vytvořit uživatele</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className={labelClass}>
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName" className={labelClass}>
              Jméno (nepovinné)
            </Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className={labelClass}>
              Heslo (min. 8 znaků)
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role" className={labelClass}>
              Role
            </Label>
            <select
              id="role"
              name="role"
              defaultValue="organizer"
              className="border-input bg-secondary text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
            >
              <option value="organizer">organizátor</option>
              <option value="admin">administrátor</option>
            </select>
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
            {pending ? "Vytvářím…" : "Vytvořit uživatele"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
