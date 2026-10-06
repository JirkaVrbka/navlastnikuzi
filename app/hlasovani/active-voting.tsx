"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { sortCandidates, type SortBy } from "@/lib/domain/voting";
import { castVote } from "./actions";
import { CandidateAvatar } from "./candidate-avatar";
import { EndVotingDialog } from "./end-voting-dialog";
import type { Candidate } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

// The live tally for the active voting. Votes change optimistically on click and
// are then persisted (atomic castVote). A Supabase Realtime subscription to this
// voting's voting_candidates rows is the source of truth: every UPDATE sets that
// candidate's votes from the payload, so all organizers' screens converge. The
// list re-sorts (by nickname or votes) and reorders with a motion FLIP animation.
export function ActiveVoting({
  votingId,
  initialCandidates,
}: {
  votingId: string;
  initialCandidates: Candidate[];
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [sortBy, setSortBy] = useState<SortBy>("nickname");
  const [error, setError] = useState("");

  // Subscribe to live vote changes for THIS voting. payload.new carries the full
  // row (replica identity full), so we set votes authoritatively on every event.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`voting-${votingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voting_candidates",
          filter: `voting_id=eq.${votingId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; votes: number } | null;
          if (!row?.id) return;
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === row.id ? { ...c, votes: Math.max(0, row.votes) } : c,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [votingId]);

  // Optimistic local bump (clamped at 0), then persist. On success Realtime
  // reconciles; on an error/throw (e.g. the voting was archived concurrently) we
  // roll back to the candidate's prior value and surface a short Czech message.
  async function bump(candidateId: string, delta: 1 | -1) {
    setError("");
    const priorVotes = candidates.find((c) => c.id === candidateId)?.votes;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, votes: Math.max(0, c.votes + delta) }
          : c,
      ),
    );
    const rollback = () => {
      if (priorVotes === undefined) return;
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, votes: priorVotes } : c,
        ),
      );
    };
    try {
      const res = await castVote(candidateId, delta);
      if (res.error) {
        rollback();
        setError(res.error);
      }
    } catch {
      rollback();
      setError("Nepodařilo se změnit hlasy.");
    }
  }

  const sorted = useMemo(
    () => sortCandidates(candidates, sortBy),
    [candidates, sortBy],
  );

  return (
    <Card className="gap-4 p-4">
      <h2 className="font-display flex items-center gap-2.5 text-[23px] font-semibold">
        <span
          aria-hidden
          className="bg-oxblood-soft size-2 animate-pulse rounded-full shadow-[0_0_10px_var(--oxblood-soft)]"
        />
        Aktivní hlasování
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs tracking-[0.1em] uppercase">
          Řadit podle:
        </span>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto min-h-11 rounded-full border px-3.5 text-[13px] font-normal tracking-normal normal-case",
            sortBy === "nickname"
              ? "border-gold bg-gold/15 text-gold-bright"
              : "border-border bg-secondary text-muted-foreground",
          )}
          onClick={() => setSortBy("nickname")}
        >
          přezdívky
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto min-h-11 rounded-full border px-3.5 text-[13px] font-normal tracking-normal normal-case",
            sortBy === "votes"
              ? "border-gold bg-gold/15 text-gold-bright"
              : "border-border bg-secondary text-muted-foreground",
          )}
          onClick={() => setSortBy("votes")}
        >
          počtu hlasů
        </Button>
      </div>

      {error ? (
        <p className="text-red text-xs" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col">
        {sorted.map((c) => (
          <motion.li
            key={c.id}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className="border-border flex items-center gap-3 border-t py-2.5 first:border-t-0"
            data-slot="candidate"
            data-candidate={c.id}
          >
            <CandidateAvatar
              name={c.name}
              nickname={c.nickname}
              picturePath={c.picturePath}
            />
            <div className="min-w-0 flex-1">
              <div className="font-display truncate text-[19px] leading-tight font-semibold">
                {c.nickname?.trim() || c.name}
              </div>
              {c.nickname?.trim() ? (
                <div className="text-muted-foreground truncate text-xs">
                  {c.name}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="bg-secondary text-foreground hover:border-oxblood-soft hover:text-oxblood-soft size-11 rounded-xl border border-[var(--line-strong)] text-xl leading-none"
                aria-label={`Odebrat hlas ${c.nickname?.trim() || c.name}`}
                onClick={() => void bump(c.id, -1)}
              >
                −
              </Button>
              <span
                className="font-display text-gold-bright min-w-10 text-center text-[28px] font-bold tabular-nums"
                aria-label="Počet hlasů"
                data-slot="votes"
              >
                {c.votes}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="bg-secondary text-foreground hover:border-gold hover:text-gold-bright size-11 rounded-xl border border-[var(--line-strong)] text-xl leading-none"
                aria-label={`Přidat hlas ${c.nickname?.trim() || c.name}`}
                onClick={() => void bump(c.id, 1)}
              >
                +
              </Button>
            </div>
          </motion.li>
        ))}
      </ul>

      <EndVotingDialog votingId={votingId} candidates={sorted} />
    </Card>
  );
}
