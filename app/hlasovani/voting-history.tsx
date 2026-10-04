import { sortCandidates } from "@/lib/domain/voting";
import { CandidateAvatar } from "./candidate-avatar";
import type { Candidate } from "./types";
import { Card } from "@/components/ui/card";

export type ArchivedVotingView = {
  id: string;
  endedAt: Date | string | null;
  eliminatedName: string | null;
  candidates: Candidate[];
};

function formatEnded(endedAt: Date | string | null): string {
  if (!endedAt) return "";
  const d = endedAt instanceof Date ? endedAt : new Date(endedAt);
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

// Read-only history of archived votings: each shows who was eliminated (or
// "nikdo") and the final tally, ordered by votes.
export function VotingHistory({ votings }: { votings: ArchivedVotingView[] }) {
  if (votings.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Historie hlasování</h2>
      <div className="flex flex-col gap-3">
        {votings.map((v) => (
          <Card key={v.id} className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {formatEnded(v.endedAt)}
              </span>
              <span>
                {v.eliminatedName ? (
                  <>
                    Vyřazen:{" "}
                    <span className="text-destructive font-medium">
                      {v.eliminatedName}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Vyřazen: nikdo</span>
                )}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {sortCandidates(v.candidates, "votes").map((c) => (
                <li key={c.id} className="flex items-center gap-3 text-sm">
                  <CandidateAvatar
                    name={c.name}
                    nickname={c.nickname}
                    picturePath={c.picturePath}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {c.nickname?.trim() || c.name}
                  </span>
                  <span className="font-semibold tabular-nums">{c.votes}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
