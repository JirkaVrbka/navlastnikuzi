"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createToken, type CreateTokenState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateTokenState = { error: "", success: "" };

export function CreateTokenForm() {
  const [state, formAction, pending] = useActionState(
    createToken,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  // Clear the label field after a successful creation (the token box persists
  // from `state.token` until the next submit).
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  async function copy() {
    if (!state.token) return;
    try {
      await navigator.clipboard.writeText(state.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the token stays
      // visible for manual copy.
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-md border p-4"
    >
      <h2 className="font-medium">Vytvořit token</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Název (kde se token používá)</Label>
        <Input id="label" name="label" type="text" maxLength={100} required />
      </div>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.token ? (
        <div className="flex flex-col gap-2 rounded-md border border-green-600/40 bg-green-50 p-3 dark:bg-green-950/30">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Token byl vytvořen. Zobrazí se jen jednou — zkopírujte si ho teď.
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-background min-w-0 flex-1 overflow-x-auto rounded px-2 py-1 font-mono text-sm">
              {state.token}
            </code>
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? "Zkopírováno" : "Kopírovat"}
            </Button>
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Vytvářím…" : "Vytvořit token"}
      </Button>
    </form>
  );
}
