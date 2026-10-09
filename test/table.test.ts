import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, closeDb } from "@/lib/db";
import { players, tableSeats } from "@/lib/db/schema";
import {
  assignSeatCore,
  clearSeatCore,
  swapSeatsCore,
} from "@/lib/services/table";
import { isDbUp } from "./helpers/db";
import {
  SEAT_COUNT,
  HEAD_LABEL,
  edgeForSeat,
  boardSlots,
} from "@/lib/domain/table";

describe("table geometry", () => {
  it("has 20 seats (6 + 6 + 4 + 4)", () => {
    expect(SEAT_COUNT).toBe(20);
  });

  it("labels the head 'Bar'", () => {
    expect(HEAD_LABEL).toBe("Bar");
  });

  it("assigns edges clockwise from the top-left corner", () => {
    expect(edgeForSeat(1)).toBe("top");
    expect(edgeForSeat(4)).toBe("top");
    expect(edgeForSeat(5)).toBe("right");
    expect(edgeForSeat(10)).toBe("right");
    expect(edgeForSeat(11)).toBe("bottom");
    expect(edgeForSeat(14)).toBe("bottom");
    expect(edgeForSeat(15)).toBe("left");
    expect(edgeForSeat(20)).toBe("left");
  });

  it("lays out each edge in on-screen reading order", () => {
    const s = boardSlots();
    expect(s.top).toEqual([1, 2, 3, 4]);
    expect(s.right).toEqual([5, 6, 7, 8, 9, 10]);
    expect(s.bottom).toEqual([14, 13, 12, 11]);
    expect(s.left).toEqual([20, 19, 18, 17, 16, 15]);
  });

  it("places every seat 1..20 exactly once across the four edges", () => {
    const s = boardSlots();
    const all = [...s.top, ...s.right, ...s.bottom, ...s.left].sort(
      (a, b) => a - b,
    );
    expect(all).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

const dbUp = await isDbUp();

afterAll(async () => {
  if (dbUp) await closeDb();
});

// Make sure the 20 permanent seats exist in the (never-reset) test stack, so the
// service tests do not depend on seed timing. Numbers only; players are attached
// per test and detached in a finally.
async function ensureSeats() {
  for (let n = 1; n <= 20; n++) {
    await db
      .insert(tableSeats)
      .values({ seatNumber: n })
      .onConflictDoNothing({ target: tableSeats.seatNumber });
  }
}

async function freeSeats(nums: number[]) {
  await db
    .update(tableSeats)
    .set({ playerId: null })
    .where(inArray(tableSeats.seatNumber, nums));
}

async function playerAt(seatNumber: number): Promise<string | null> {
  const [row] = await db
    .select({ playerId: tableSeats.playerId })
    .from(tableSeats)
    .where(eq(tableSeats.seatNumber, seatNumber))
    .limit(1);
  return row?.playerId ?? null;
}

describe.skipIf(!dbUp)("table seat services", () => {
  it("assignSeatCore seats a player and moves them out of any previous seat", async () => {
    await ensureSeats();
    const [p] = await db
      .insert(players)
      .values({ name: `Stůl ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    try {
      await freeSeats([1, 2]);

      expect(await assignSeatCore(1, p.id)).toEqual({});
      expect(await playerAt(1)).toBe(p.id);

      expect(await assignSeatCore(2, p.id)).toEqual({});
      expect(await playerAt(2)).toBe(p.id);
      expect(await playerAt(1)).toBeNull();
    } finally {
      await freeSeats([1, 2]);
      await db.delete(players).where(eq(players.id, p.id));
    }
  });

  it("clearSeatCore empties a seat", async () => {
    await ensureSeats();
    const [p] = await db
      .insert(players)
      .values({ name: `Stůl ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    try {
      await freeSeats([3]);
      await assignSeatCore(3, p.id);
      expect(await clearSeatCore(3)).toEqual({});
      expect(await playerAt(3)).toBeNull();
    } finally {
      await freeSeats([3]);
      await db.delete(players).where(eq(players.id, p.id));
    }
  });

  it("swapSeatsCore trades the two seats' players", async () => {
    await ensureSeats();
    const [a] = await db
      .insert(players)
      .values({ name: `Stůl ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [b] = await db
      .insert(players)
      .values({ name: `Stůl ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    try {
      await freeSeats([4, 5]);
      await assignSeatCore(4, a.id);
      await assignSeatCore(5, b.id);

      expect(await swapSeatsCore(4, 5)).toEqual({});
      expect(await playerAt(4)).toBe(b.id);
      expect(await playerAt(5)).toBe(a.id);
    } finally {
      await freeSeats([4, 5]);
      await db.delete(players).where(inArray(players.id, [a.id, b.id]));
    }
  });

  it("swapSeatsCore moves a player into an empty seat", async () => {
    await ensureSeats();
    const [a] = await db
      .insert(players)
      .values({ name: `Stůl ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    try {
      await freeSeats([6, 7]);
      await assignSeatCore(6, a.id);

      expect(await swapSeatsCore(6, 7)).toEqual({});
      expect(await playerAt(6)).toBeNull();
      expect(await playerAt(7)).toBe(a.id);
    } finally {
      await freeSeats([6, 7]);
      await db.delete(players).where(eq(players.id, a.id));
    }
  });
});
