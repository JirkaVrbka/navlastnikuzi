import { db } from "@/lib/db";

// Placement joins shared by the active + archived reads: each placement carries
// its player (any field may be null except id/name).
const placementWith = {
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

// The single active zpověď with its placements (+ joined player), or null if
// none is open. Placements are ordered by player name for stable columns.
export async function getActiveConfession() {
  const confession = await db.query.confessions.findFirst({
    where: (c, { eq }) => eq(c.status, "active"),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    with: {
      placements: {
        with: placementWith,
      },
    },
  });
  if (!confession) return null;
  return {
    ...confession,
    placements: [...confession.placements].sort((a, b) =>
      (a.player.nickname?.trim() || a.player.name).localeCompare(
        b.player.nickname?.trim() || b.player.name,
        "cs",
      ),
    ),
  };
}

// Archived zpovědi, newest finished first, with the same placement joins for
// the read-only history list.
export async function getArchivedConfessions() {
  return db.query.confessions.findMany({
    where: (c, { eq }) => eq(c.status, "archived"),
    orderBy: (c, { desc }) => [desc(c.finishedAt), desc(c.createdAt)],
    with: {
      placements: {
        orderBy: (p, { asc }) => [asc(p.createdAt), asc(p.id)],
        with: placementWith,
      },
    },
  });
}

// Inferred row types for the client UI (Phase B).
export type ActiveConfession = NonNullable<
  Awaited<ReturnType<typeof getActiveConfession>>
>;
export type ArchivedConfession = Awaited<
  ReturnType<typeof getArchivedConfessions>
>[number];
export type ConfessionPlacementRow = ActiveConfession["placements"][number];
