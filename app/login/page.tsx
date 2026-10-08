"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: LoginState = { error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    // Standalone screen: the bottom tab bar is hidden on /login, and the
    // negative bottom margin cancels the layout's tab-bar clearance so the
    // card sits in the true centre of the viewport.
    <main className="-mb-[calc(5.5rem+env(safe-area-inset-bottom))] flex min-h-screen flex-col items-center justify-center px-[18px] py-10">
      <div className="w-full max-w-[400px]">
        <header className="mb-8 text-center">
          <h1 className="font-display-italic text-[38px] leading-none font-semibold [text-shadow:0_0_26px_rgba(201,162,100,0.18)]">
            Na Vlastní Kůži
          </h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-[23px]">Přihlášení</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="email"
                  className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase"
                >
                  E-mail nebo jméno
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="např. martini"
                  required
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="password"
                  className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase"
                >
                  Heslo
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11"
                />
              </div>
              {state.error ? (
                <p className="text-destructive text-sm" role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="mt-1 min-h-[48px] w-full"
              >
                {pending ? "Přihlašuji…" : "Přihlásit se"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
