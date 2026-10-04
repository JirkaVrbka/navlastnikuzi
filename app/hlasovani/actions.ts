"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createVotingCore,
  castVoteCore,
  endVotingCore,
} from "@/lib/services/voting";

// Start a new voting round (snapshots in-game players as candidates). The core
// (lib/services/voting.ts) is shared with the MCP tools; the action adds the
// cookie-session gate and cache revalidation.
export async function createVoting(): Promise<{ error?: string }> {
  await requireUser();
  const result = await createVotingCore();
  if (!result.error) revalidatePath("/hlasovani");
  return result;
}

// Atomically change a candidate's vote count by delta (+1 / −1), clamped at 0.
// requireUser-gated. Realtime broadcasts the UPDATE to every subscribed tally;
// no revalidate here (the live subscription + optimistic bump drive the UI).
export async function castVote(
  candidateId: string,
  delta: number,
): Promise<{ error?: string }> {
  await requireUser();
  return castVoteCore(candidateId, delta);
}

// End a voting ATOMICALLY (archive + validated elimination in one tx). Shared
// core; the action adds the session gate and revalidates both affected pages.
export async function endVoting(
  votingId: string,
  eliminatePlayerId: string | null,
): Promise<{ error?: string }> {
  await requireUser();
  const result = await endVotingCore(votingId, eliminatePlayerId);
  if (!result.error) {
    revalidatePath("/hlasovani");
    revalidatePath("/hraci");
  }
  return result;
}
