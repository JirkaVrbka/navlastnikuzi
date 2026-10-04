import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import type { EliminateReason } from "@/lib/validation/players";

// A db-or-transaction executor, so this helper can run standalone or be enlisted
// in a caller's transaction (e.g. endVoting archives + eliminates atomically).
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// All players (oldest first for a stable board), each with its notes (oldest
// first). Drop-out order is derived in lib/domain/players.ts, not read here.
export async function getPlayers() {
  return db.query.players.findMany({
    orderBy: (p, { asc }) => [asc(p.createdAt), asc(p.id)],
    with: {
      notes: {
        orderBy: (n, { asc }) => [asc(n.position), asc(n.createdAt), asc(n.id)],
      },
    },
  });
}

export type PlayerWithNotes = Awaited<ReturnType<typeof getPlayers>>[number];

// Mark a player out of the game with a reason (status is owned by the Players
// feature). Shared by the Players eliminate action and by endVoting (reason
// 'voted_out'); runs against `db` or a caller's transaction (executor). Sets
// in_game=false + eliminated_at=now() + reason together so the
// players_status_check invariant always holds. Only updates a row that is still
// in_game=true, so an already-out player is never silently re-eliminated (which
// would reset eliminated_at and corrupt the drop-out order). Returns the number
// of rows updated (0 = the player no longer exists OR is already out).
export async function eliminatePlayerById(
  executor: Executor,
  playerId: string,
  reason: EliminateReason,
): Promise<number> {
  const updated = await executor
    .update(players)
    .set({ inGame: false, eliminatedAt: new Date(), reason })
    .where(and(eq(players.id, playerId), eq(players.inGame, true)))
    .returning({ id: players.id });
  return updated.length;
}
