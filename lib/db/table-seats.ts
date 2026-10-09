import { asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tableSeats, players } from "@/lib/db/schema";

// All 20 seats in number order, each LEFT JOINed to its player (null columns when
// the seat is empty). inGame is read so the board can grey a dead player's seat.
export async function getTableSeats() {
  return db
    .select({
      seatNumber: tableSeats.seatNumber,
      playerName: players.name,
      playerNickname: players.nickname,
      picturePath: players.picturePath,
      inGame: players.inGame,
    })
    .from(tableSeats)
    .leftJoin(players, eq(tableSeats.playerId, players.id))
    .orderBy(asc(tableSeats.seatNumber));
}

export type TableSeatRow = Awaited<ReturnType<typeof getTableSeats>>[number];

// Every player NOT currently in a seat (dead or alive — the picker shows all),
// oldest first for a stable list. Feeds the seat-assignment picker.
export async function getUnseatedPlayers() {
  const seated = await db
    .select({ playerId: tableSeats.playerId })
    .from(tableSeats)
    .where(isNotNull(tableSeats.playerId));
  const seatedIds = seated
    .map((s) => s.playerId)
    .filter((id): id is string => id !== null);

  return db.query.players.findMany({
    where: seatedIds.length
      ? (p, { notInArray }) => notInArray(p.id, seatedIds)
      : undefined,
    orderBy: (p, { asc }) => [asc(p.createdAt), asc(p.id)],
    columns: {
      id: true,
      name: true,
      nickname: true,
      picturePath: true,
      inGame: true,
    },
  });
}

export type UnseatedPlayer = Awaited<
  ReturnType<typeof getUnseatedPlayers>
>[number];
