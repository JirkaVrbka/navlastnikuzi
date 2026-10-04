"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVoting } from "./actions";
import { Button } from "@/components/ui/button";

// Starts a new voting round (snapshots in-game players as candidates), then
// refreshes so the active tally appears.
export function NewVotingButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function create() {
    setError("");
    start(async () => {
      const res = await createVoting();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className={className}>
      <Button type="button" disabled={pending} onClick={create}>
        {pending ? "Zakládám…" : "Nové hlasování"}
      </Button>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
