// Voting core logic — plain, session-less functions shared by the web server
// actions (app/hlasovani/actions.ts) and the MCP tools (lib/mcp/tools.ts). The
// web action wraps each with requireUser + revalidatePath; the MCP tool wraps
// with the bearer gate. The Czech result messages live HERE so both paths are
// identical. Each returns { error?: string } (empty object = success), matching
// the original actions' contract exactly.

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, votings, votingCandidates } from "@/lib/db/schema";
import { eliminatePlayerById } from "@/lib/db/players";

// Start a new voting round. Snapshots every in-game player as a candidate (0
// votes) in a transaction. Only one voting may be open at a time (action-level
// guard; no DB unique index, since the shared test stack may hold stray active
// rows). Errors if a voting is already active or no one is in game.
export async function createVotingCore(): Promise<{ error?: string }> {
  try {
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
  return {};
}

// Atomically change a candidate's vote count by delta (+1 / −1), clamped at 0 in
// SQL (GREATEST). Only candidates of an ACTIVE voting are mutable — a cast on an
// archived voting matches no row and is rejected.
export async function castVoteCore(
  candidateId: string,
  delta: number,
): Promise<{ error?: string }> {
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
// validate the eliminee (must be a candidate of THIS voting whose player is
// still in game), archive it, and — when an eliminee id is passed — mark that
// player out with reason 'voted_out' via the shared helper in the SAME tx. No
// row is archived unless the eliminee (if any) is valid.
export async function endVotingCore(
  votingId: string,
  eliminatePlayerId: string | null,
): Promise<{ error?: string }> {
  try {
    const result = await db.transaction(
      async (tx): Promise<{ error?: string }> => {
        const [voting] = await tx
          .select({ id: votings.id })
          .from(votings)
          .where(and(eq(votings.id, votingId), eq(votings.status, "active")))
          .for("update");
        if (!voting) {
          return { error: "Hlasování již bylo ukončeno." };
        }

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
          if (rows === 0) throw new Error("eliminee no longer in game");
        }
        return {};
      },
    );
    return result;
  } catch {
    return { error: "Nepodařilo se ukončit hlasování." };
  }
}
