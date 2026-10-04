"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { players, votings, votingCandidates } from "@/lib/db/schema";
import { eliminatePlayerById } from "@/lib/db/players";

// Start a new voting round. Snapshots every in-game player as a candidate (0
// votes) in a transaction. Errors if no one is in game (nothing to vote on).
export async function createVoting(): Promise<{ error?: string }> {
  await requireUser();
  try {
    // Only one voting may be open at a time (action-level guard; no DB unique
    // index, since the shared test stack may hold stray active rows).
    const alreadyActive = await db
      .select({ id: votings.id })
      .from(votings)
      .where(eq(votings.status, "active"))
      .limit(1);
    if (alreadyActive.length > 0) {
      return { error: "Hlasování již probíhá." };
    }
    const inGame = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.inGame, true));
    if (inGame.length === 0) {
      return { error: "Žádní hráči ve hře — není o kom hlasovat." };
    }
    await db.transaction(async (tx) => {
      const [voting] = await tx
        .insert(votings)
        .values({ status: "active" })
        .returning({ id: votings.id });
      await tx.insert(votingCandidates).values(
        inGame.map((p) => ({
          votingId: voting.id,
          playerId: p.id,
          votes: 0,
        })),
      );
    });
  } catch {
    return { error: "Nepodařilo se založit hlasování." };
  }
  revalidatePath("/hlasovani");
  return {};
}

// Atomically change a candidate's vote count by delta (+1 / −1), clamped at 0 in
// SQL (GREATEST). Only candidates of an ACTIVE voting are mutable — a cast on an
// archived voting matches no row and is rejected. requireUser-gated. Realtime
// broadcasts the UPDATE to every subscribed tally; no revalidate here (the live
// subscription + optimistic bump drive the UI).
export async function castVote(
  candidateId: string,
  delta: number,
): Promise<{ error?: string }> {
  await requireUser();
  if (delta !== 1 && delta !== -1) return { error: "Neplatná změna hlasů." };
  try {
    const updated = await db
      .update(votingCandidates)
      .set({ votes: sql`GREATEST(0, ${votingCandidates.votes} + ${delta})` })
      .where(
        and(
          eq(votingCandidates.id, candidateId),
          sql`EXISTS (SELECT 1 FROM ${votings} WHERE ${votings.id} = ${votingCandidates.votingId} AND ${votings.status} = 'active')`,
        ),
      )
      .returning({ id: votingCandidates.id });
    if (updated.length === 0) {
      return { error: "Hlasování je uzavřené." };
    }
  } catch {
    return { error: "Nepodařilo se změnit hlasy." };
  }
  return {};
}

// End a voting ATOMICALLY: in ONE transaction, lock the still-active voting,
// validate the eliminee, archive it (status + ended_at + eliminated_player_id)
// and — when an eliminee id is passed — mark that player out with reason
// 'voted_out' (status owned by the Players feature, via the shared helper, in
// the SAME tx). Rejects if the voting is already archived, or if the eliminee is
// not a candidate of THIS voting / is already out. No row is archived unless the
// eliminee (if any) is valid, so archive + elimination always agree.
export async function endVoting(
  votingId: string,
  eliminatePlayerId: string | null,
): Promise<{ error?: string }> {
  await requireUser();
  try {
    const result = await db.transaction(
      async (tx): Promise<{ error?: string }> => {
        // Lock the active voting for the duration of the tx (serializes concurrent
        // end attempts); none → already ended.
        const [voting] = await tx
          .select({ id: votings.id })
          .from(votings)
          .where(and(eq(votings.id, votingId), eq(votings.status, "active")))
          .for("update");
        if (!voting) {
          return { error: "Hlasování již bylo ukončeno." };
        }

        // The eliminee must be a candidate of THIS voting whose player is still in
        // game. Validate BEFORE any write so an invalid pick archives nothing.
        if (eliminatePlayerId) {
          const [candidate] = await tx
            .select({ id: votingCandidates.id })
            .from(votingCandidates)
            .innerJoin(players, eq(votingCandidates.playerId, players.id))
            .where(
              and(
                eq(votingCandidates.votingId, votingId),
                eq(votingCandidates.playerId, eliminatePlayerId),
                eq(players.inGame, true),
              ),
            );
          if (!candidate) {
            return {
              error: "Vybraný hráč není platný kandidát nebo už je vyřazen.",
            };
          }
        }

        await tx
          .update(votings)
          .set({
            status: "archived",
            endedAt: new Date(),
            eliminatedPlayerId: eliminatePlayerId,
          })
          .where(eq(votings.id, votingId));

        if (eliminatePlayerId) {
          const rows = await eliminatePlayerById(
            tx,
            eliminatePlayerId,
            "voted_out",
          );
          // Validated above inside this tx — a 0 here means a concurrent change
          // slipped the player out; throw to roll back archive + elimination.
          if (rows === 0) throw new Error("eliminee no longer in game");
        }
        return {};
      },
    );
    if (result.error) return result;
  } catch {
    return { error: "Nepodařilo se ukončit hlasování." };
  }
  revalidatePath("/hlasovani");
  revalidatePath("/hraci");
  return {};
}
