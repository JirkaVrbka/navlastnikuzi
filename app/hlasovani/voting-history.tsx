"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

export type ArchivedVotingView = {
  id: string;
  endedAt: Date | string | null;
  eliminatedName: string | null;
  // Votes the eliminated player received (null when nobody was eliminated).
  eliminatedVotes: number | null;
};

function formatEnded(endedAt: Date | string | null): string {
  if (!endedAt) return "";
  const d = endedAt instanceof Date ? endedAt : new Date(endedAt);
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

// Czech plural for "hlas" (vote): 1 hlas, 2–4 hlasy, 0/5+ hlasů.
function votesLabel(n: number): string {
  if (n === 1) return "hlas";
  if (n >= 2 && n <= 4) return "hlasy";
  return "hlasů";
}

// Read-only history of archived votings in a collapsible card: each row shows
// who was eliminated (or "nikdo"), when it ended, and the final tally ordered by
// votes (descending).
export function VotingHistory({ votings }: { votings: ArchivedVotingView[] }) {
  const [open, setOpen] = useState(false);
  if (votings.length === 0) return null;

  return (
    <Card className="mt-4 gap-0 p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground flex min-h-11 w-full items-center justify-between py-1.5 text-[11px] tracking-[0.2em] uppercase"
      >
        <span>Historie hlasování</span>
        <span
          aria-hidden
          className={cn("text-gold transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="mt-1 flex flex-col gap-2">
          {votings.map((v) => (
            <div
              key={v.id}
              className="border-border flex items-center justify-between gap-3 rounded-xl border bg-[var(--charcoal)] px-3.5 py-3"
            >
              <div className="min-w-0">
                <div className="font-display text-[17px]">
                  {v.eliminatedName ? (
                    <>
                      Vyřazen:{" "}
                      <span className="text-red font-semibold">
                        {v.eliminatedName}
                      </span>
                    </>
                  ) : (
                    <>
                      Vyřazen:{" "}
                      <span className="text-muted-foreground">nikdo</span>
                    </>
                  )}
                </div>
                <div className="text-muted-foreground font-sans text-[11px] tracking-[0.1em] uppercase">
                  {formatEnded(v.endedAt)}
                </div>
              </div>
              {v.eliminatedVotes != null ? (
                <div className="shrink-0 text-right tabular-nums">
                  <span className="text-red font-display text-[19px] font-semibold">
                    {v.eliminatedVotes}
                  </span>{" "}
                  <span className="text-muted-foreground text-[11px] tracking-[0.1em] uppercase">
                    {votesLabel(v.eliminatedVotes)}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
