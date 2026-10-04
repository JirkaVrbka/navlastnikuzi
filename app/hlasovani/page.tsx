import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveVoting, getArchivedVotings } from "@/lib/db/voting";
import { buttonVariants } from "@/components/ui/button";
import { NewVotingButton } from "./new-voting-button";
import { ActiveVoting } from "./active-voting";
import { VotingHistory } from "./voting-history";
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
  await requireUser();
  const [active, archived] = await Promise.all([
    getActiveVoting(),
    getArchivedVotings(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hlasování</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Domů
        </Link>
      </div>

      {active ? (
        <ActiveVoting
          votingId={active.id}
          initialCandidates={active.candidates.map(toCandidate)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            Žádné aktivní hlasování. Založte nové z hráčů ve hře.
          </p>
          <NewVotingButton className="self-start" />
        </div>
      )}

      <VotingHistory
        votings={archived.map((v) => ({
          id: v.id,
          endedAt: v.endedAt,
          eliminatedName: v.eliminatedPlayer
            ? v.eliminatedPlayer.nickname?.trim() || v.eliminatedPlayer.name
            : null,
          candidates: v.candidates.map(toCandidate),
        }))}
      />
    </main>
  );
}
