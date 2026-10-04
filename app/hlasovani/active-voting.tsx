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
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Aktivní hlasování</h2>
        <EndVotingDialog votingId={votingId} candidates={sorted} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Řadit podle:</span>
        <Button
          type="button"
          size="sm"
          variant={sortBy === "nickname" ? "secondary" : "outline"}
          onClick={() => setSortBy("nickname")}
        >
          přezdívky
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sortBy === "votes" ? "secondary" : "outline"}
          onClick={() => setSortBy("votes")}
        >
          počtu hlasů
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {sorted.map((c) => (
          <motion.li
            key={c.id}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className="bg-background flex items-center gap-3 rounded-lg border p-2"
            data-slot="candidate"
            data-candidate={c.id}
          >
            <CandidateAvatar
              name={c.name}
              nickname={c.nickname}
              picturePath={c.picturePath}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">
                {c.nickname?.trim() || c.name}
              </span>
              {c.nickname?.trim() ? (
                <span className="text-muted-foreground truncate text-xs">
                  {c.name}
                </span>
              ) : null}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Odebrat hlas ${c.nickname?.trim() || c.name}`}
                onClick={() => void bump(c.id, -1)}
              >
                −1
              </Button>
              <span
                className="w-8 text-center text-lg font-semibold tabular-nums"
                aria-label="Počet hlasů"
                data-slot="votes"
              >
                {c.votes}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Přidat hlas ${c.nickname?.trim() || c.name}`}
                onClick={() => void bump(c.id, 1)}
              >
                +1
              </Button>
            </div>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}
