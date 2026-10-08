"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConfession } from "./actions";
import { Button } from "@/components/ui/button";

// Starts a new zpověď (snapshots in-game players, split balanced across the two
// columns), then refreshes so the active two-column view appears.
export function NewConfessionButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function create() {
    setError("");
    start(async () => {
      const res = await createConfession();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className={className}>
      <Button type="button" disabled={pending} onClick={create}>
        {pending ? "Zakládám…" : "Nová zpověď"}
      </Button>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
