"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createKonklave } from "./actions";
import { Button } from "@/components/ui/button";

// Starts a new konkláve (snapshots in-game players into placements with random
// distinct rooms), then refreshes so the active placement list appears.
export function NewKonklaveButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function create() {
    setError("");
    start(async () => {
      const res = await createKonklave();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className={className}>
      <Button type="button" disabled={pending} onClick={create}>
        {pending ? "Zakládám…" : "Nové konkláve"}
      </Button>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
