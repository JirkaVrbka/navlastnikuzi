"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sortCandidates } from "@/lib/domain/voting";
import { endVoting } from "./actions";
import type { Candidate } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissibleOnlyByButton } from "@/app/itinerar/dialog-dismiss";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const NOBODY = "__nobody__";

// "Ukončit hlasování" → a dialog to pick who gets eliminated (default the
// top-voted candidate) or nobody, then archives the voting (and eliminates the
// chosen player with reason voted_out via endVoting).
export function EndVotingDialog({
  votingId,
  candidates,
}: {
  votingId: string;
  candidates: Candidate[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  // Only candidates whose player is still in game can be eliminated (a player
  // murdered via /hraci mid-round must not be offered). The server re-validates
  // on end regardless — this is belt + suspenders.
  const eligible = useMemo(
    () =>
      sortCandidates(
        candidates.filter((c) => c.inGame),
        "votes",
      ),
    [candidates],
  );

  // Default eliminee = the top-voted eligible candidate (deterministic tiebreak).
  const topPlayerId = useMemo(
    () => eligible[0]?.playerId ?? NOBODY,
    [eligible],
  );
  const [choice, setChoice] = useState<string>(topPlayerId);

  // Keep the default in sync if the tally changed since the dialog last opened.
  function openDialog() {
    setChoice(topPlayerId);
    setError("");
    setOpen(true);
  }

  function confirm() {
    setError("");
    const eliminate = choice === NOBODY ? null : choice;
    start(async () => {
      const res = await endVoting(votingId, eliminate);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" onClick={openDialog}>
        Ukončit hlasování
      </Button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ukončit hlasování</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium">Koho vyřadit</span>
              <select
                aria-label="Koho vyřadit"
                className={selectClass}
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
              >
                {eligible.map((c) => (
                  <option key={c.id} value={c.playerId}>
                    {(c.nickname?.trim() || c.name) + ` (${c.votes})`}
                  </option>
                ))}
                <option value={NOBODY}>Nikoho</option>
              </select>
            </label>

            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={confirm}
              >
                {pending ? "Ukončuji…" : "Ukončit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
