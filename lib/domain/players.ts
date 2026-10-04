// Drop-out order — pure, framework/DB-free game logic.
//
// The order a player dropped out is NOT stored; it is derived by ranking the
// out players (`!inGame`) by their elimination time, ascending. Ties (same
// timestamp) break by id for a stable, deterministic result. Bringing a player
// back nulls `eliminatedAt`, which removes them from the ranking and renumbers
// everyone below — all of that falls out of recomputing this map.

export type RankablePlayer = {
  id: string;
  inGame: boolean;
  // Accepts a Date (Drizzle read), an ISO string, epoch millis, or null.
  eliminatedAt: Date | string | number | null;
};

function toMillis(v: Date | string | number): number {
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

// Map of playerId → 1-based drop-out order. In-game players are absent from it.
export function computeDropoutOrder(
  players: RankablePlayer[],
): Map<string, number> {
  const out = players
    .filter((p) => !p.inGame && p.eliminatedAt != null)
    .map((p) => ({ id: p.id, t: toMillis(p.eliminatedAt!) }))
    .sort((a, b) =>
      a.t !== b.t ? a.t - b.t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );

  const order = new Map<string, number>();
  out.forEach((p, i) => order.set(p.id, i + 1));
  return order;
}
