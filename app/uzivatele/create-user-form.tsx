"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser, type CreateUserState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateUserState = { error: "", success: "" };

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful creation.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-md border p-4"
    >
      <h2 className="font-medium">Vytvořit uživatele</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Jméno (nepovinné)</Label>
        <Input id="displayName" name="displayName" type="text" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Heslo (min. 8 znaků)</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          defaultValue="organizer"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
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
        <p className="text-sm text-green-600" role="status">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Vytvářím…" : "Vytvořit uživatele"}
      </Button>
    </form>
  );
}
