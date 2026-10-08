import { requireAdmin } from "@/lib/auth";
import { getActiveVoting, getArchivedVotings } from "@/lib/db/voting";
import { NewVotingButton } from "./new-voting-button";
import { ActiveVoting } from "./active-voting";
import { VotingHistory } from "./voting-history";
import { Card } from "@/components/ui/card";
import type { Candidate } from "./types";

// A voting_candidates row (+ joined player) → the flat client shape. `id` is the
// candidate id (the key Realtime payloads and the FLIP reorder match on).
function toCandidate(c: {
  id: string;
  votes: number;
  player: {
    id: string;
    name: string;
    nickname: string | null;
    picturePath: string | null;
    inGame: boolean;
  };
}): Candidate {
  return {
    id: c.id,
    playerId: c.player.id,
    name: c.player.name,
    nickname: c.player.nickname,
    picturePath: c.player.picturePath,
    votes: c.votes,
    inGame: c.player.inGame,
  };
}

export default async function VotingPage() {
  // Overlap the admin auth check with the data queries in one Promise.all
  // instead of awaiting requireAdmin serially first (it still throws a
  // redirect() that rejects the Promise.all for non-admins).
  const [, active, archived] = await Promise.all([
    requireAdmin(),
    getActiveVoting(),
    getArchivedVotings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-2">
      <h1 className="font-display mt-1.5 mb-0.5 text-[27px] font-semibold tracking-[0.01em]">
        Hlasování
      </h1>
      <p className="text-muted-foreground mb-[18px] text-xs tracking-[0.16em] uppercase">
        Kolo odhalení
      </p>

      {active ? (
        <ActiveVoting
          votingId={active.id}
          initialCandidates={active.candidates.map(toCandidate)}
        />
      ) : (
        <Card className="items-start gap-4 p-6">
          <p className="text-muted-foreground text-sm">
            Žádné aktivní hlasování. Založte nové z hráčů ve hře.
          </p>
          <NewVotingButton className="self-start" />
        </Card>
      )}

      <VotingHistory
        votings={archived.map((v) => ({
          id: v.id,
          endedAt: v.endedAt,
          eliminatedName: v.eliminatedPlayer
            ? v.eliminatedPlayer.nickname?.trim() || v.eliminatedPlayer.name
            : null,
          eliminatedVotes: v.eliminatedPlayer
            ? (v.candidates.find((c) => c.player.id === v.eliminatedPlayer!.id)
                ?.votes ?? null)
            : null,
        }))}
      />
    </main>
  );
}
