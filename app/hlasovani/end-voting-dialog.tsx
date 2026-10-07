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
import { cn } from "cn";

const NOBODY = "__nobody__";

// One selectable eliminee row (radio). The visible radio dot + border show the
// selection; the real <input> is screen-reader-only but still keyboard-focusable.
function EligibleOption({
  checked,
  onSelect,
  label,
  votes,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  votes?: number;
}) {
  return (
    <label
      className={cn(
        "bg-secondary has-[:focus-visible]:ring-ring/50 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors has-[:focus-visible]:ring-3",
        checked ? "border-ring" : "border-input",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-full border",
          checked ? "border-ring" : "border-input",
        )}
      >
        {checked ? <span className="bg-gold size-2.5 rounded-full" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {votes !== undefined ? (
        <span className="text-muted-foreground shrink-0 tabular-nums">
          ({votes})
        </span>
      ) : null}
      <input
        type="radio"
        name="eliminee"
        className="sr-only"
        checked={checked}
        onChange={onSelect}
      />
    </label>
  );
}

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
      <Button
        type="button"
        variant="ghost"
        onClick={openDialog}
        className="from-oxblood-soft to-oxblood font-display h-auto min-h-[52px] w-full rounded-[14px] border border-[rgba(201,162,100,0.3)] bg-gradient-to-b text-[19px] font-semibold tracking-[0.06em] text-white normal-case shadow-[0_10px_30px_-12px_rgba(123,30,34,0.9)] hover:brightness-110"
      >
        Ukončit hlasování
      </Button>
      <Dialog open={open} onOpenChange={dismissibleOnlyByButton(setOpen)}>
        <DialogContent className="grid max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ukončit hlasování</DialogTitle>
          </DialogHeader>

          {/* Scrollable body: the eliminee list scrolls here while the footer
              buttons below stay visible on short screens. */}
          <div className="min-h-0 overflow-y-auto text-sm">
            <p className="mb-2 font-medium">Koho vyřadit</p>
            <div
              role="radiogroup"
              aria-label="Koho vyřadit"
              className="flex flex-col gap-1.5"
            >
              {eligible.map((c) => (
                <EligibleOption
                  key={c.id}
                  label={c.nickname?.trim() || c.name}
                  votes={c.votes}
                  checked={choice === c.playerId}
                  onSelect={() => setChoice(c.playerId)}
                />
              ))}
              <EligibleOption
                label="Nikoho"
                checked={choice === NOBODY}
                onSelect={() => setChoice(NOBODY)}
              />
            </div>

            {error ? (
              <p className="text-destructive mt-3 text-xs" role="alert">
                {error}
              </p>
            ) : null}
          </div>

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
        </DialogContent>
      </Dialog>
    </>
  );
}
