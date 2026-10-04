import { db } from "@/lib/db";

// Candidate ordering is applied client-side (lib/domain/voting.ts) so the tally
// can re-sort live; reads here just return the data with its player joined.
const candidateWith = {
  player: {
    columns: {
      id: true,
      name: true,
      nickname: true,
      picturePath: true,
      inGame: true,
    },
  },
} as const;

// The single active (open) voting with its candidates + each candidate's player,
// or null if no voting is open. Only one voting is expected active at a time.
export async function getActiveVoting() {
  const voting = await db.query.votings.findFirst({
    where: (v, { eq }) => eq(v.status, "active"),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
    with: { candidates: { with: candidateWith } },
  });
  return voting ?? null;
}

// Archived (ended) votings, newest first, with candidates + the eliminated
// player (if any) for the read-only history list.
export async function getArchivedVotings() {
  return db.query.votings.findMany({
    where: (v, { eq }) => eq(v.status, "archived"),
    orderBy: (v, { desc }) => [desc(v.endedAt), desc(v.createdAt)],
    with: {
      candidates: { with: candidateWith },
      eliminatedPlayer: { columns: { id: true, name: true, nickname: true } },
    },
  });
}
