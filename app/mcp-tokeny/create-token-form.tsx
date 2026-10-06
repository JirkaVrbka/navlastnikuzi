"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createToken, type CreateTokenState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Vytvořit token</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="label"
              className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase"
            >
              Název (kde se token používá)
            </Label>
            <Input
              id="label"
              name="label"
              type="text"
              maxLength={100}
              required
              className="h-11"
            />
          </div>

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}

          {state.token ? (
            <div className="border-green/40 bg-green-bg flex flex-col gap-3 rounded-lg border p-3">
              <p className="text-green text-sm font-medium">
                Token byl vytvořen. Zobrazí se jen jednou — zkopírujte si ho
                teď.
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-background text-foreground min-w-0 flex-1 overflow-x-auto rounded-md px-3 py-2 font-mono text-sm break-all select-all">
                  {state.token}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copy}
                  className="min-h-[44px] shrink-0"
                >
                  {copied ? "Zkopírováno" : "Kopírovat"}
                </Button>
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="mt-1 min-h-[48px] w-full"
          >
            {pending ? "Vytvářím…" : "Vytvořit token"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
