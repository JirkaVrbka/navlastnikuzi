// Table-seating core logic — plain, session-less functions. The web actions
// (app/stul/actions.ts) wrap each with requireUser + isAdmin + revalidatePath.
// Czech result messages live HERE. Each returns { error? } ({} = success),
// mirroring lib/services/konklave.ts. No MCP surface (web UI only).

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { tableSeats } from "@/lib/db/schema";

// Seat a player (also the "change" action — overwrites whoever sits there). A
// player holds at most one seat, so their previous seat (if any) is cleared in
// the SAME transaction before they are dropped into the target. Clearing first
// means the partial unique index on player_id is never transiently violated.
export async function assignSeatCore(
  seatNumber: number,
  playerId: string,
): Promise<{ error?: string }> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(tableSeats)
        .set({ playerId: null })
        .where(eq(tableSeats.playerId, playerId));
      await tx
        .update(tableSeats)
        .set({ playerId })
        .where(eq(tableSeats.seatNumber, seatNumber));
    });
  } catch {
    return { error: "Nepodařilo se obsadit sedadlo." };
  }
  return {};
}

// Empty a seat.
export async function clearSeatCore(
  seatNumber: number,
): Promise<{ error?: string }> {
  try {
    await db
      .update(tableSeats)
      .set({ playerId: null })
      .where(eq(tableSeats.seatNumber, seatNumber));
  } catch {
    return { error: "Nepodařilo se uvolnit sedadlo." };
  }
  return {};
}

// Trade the occupants of two seats. Both are cleared first so the partial unique
// index on player_id can't transiently collide, then each receives the other's
// player (an empty source/target just moves the one player).
export async function swapSeatsCore(
  seatA: number,
  seatB: number,
): Promise<{ error?: string }> {
  if (seatA === seatB) return { error: "Nelze prohodit stejné sedadlo." };
  try {
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          seatNumber: tableSeats.seatNumber,
          playerId: tableSeats.playerId,
        })
        .from(tableSeats)
        .where(inArray(tableSeats.seatNumber, [seatA, seatB]));
      const pa = rows.find((r) => r.seatNumber === seatA)?.playerId ?? null;
      const pb = rows.find((r) => r.seatNumber === seatB)?.playerId ?? null;

      await tx
        .update(tableSeats)
        .set({ playerId: null })
        .where(inArray(tableSeats.seatNumber, [seatA, seatB]));
      if (pb !== null) {
        await tx
          .update(tableSeats)
          .set({ playerId: pb })
          .where(eq(tableSeats.seatNumber, seatA));
      }
      if (pa !== null) {
        await tx
          .update(tableSeats)
          .set({ playerId: pa })
          .where(eq(tableSeats.seatNumber, seatB));
      }
    });
  } catch {
    return { error: "Nepodařilo se prohodit sedadla." };
  }
  return {};
}
