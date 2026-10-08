import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, closeDb } from "@/lib/db";
import { players, konklaves, konklavePlacements } from "@/lib/db/schema";
import { createKonklaveCore } from "@/lib/services/konklave";
import { isDbUp } from "./helpers/db";

// DB-backed (shared TEST stack, never reset). createKonklaveCore has a global
// "one active at a time" guard and snapshots EVERY in-game player, so each test
// first archives any pre-existing active konkláve, then asserts only on rows it
// can attribute to the konkláve it created.
const dbUp = await isDbUp();

afterAll(async () => {
  if (dbUp) await closeDb();
});

describe.skipIf(!dbUp)("createKonklaveCore — no room auto-assignment", () => {
  it("inserts a placement with roomId null for every in-game player", async () => {
    // Clear any active konkláve left by earlier work so the guard lets us start.
    await db
      .update(konklaves)
      .set({ status: "archived", finishedAt: new Date() })
      .where(eq(konklaves.status, "active"));

    // A known in-game player guarantees at least one placement to assert on.
    const [player] = await db
      .insert(players)
      .values({ name: `Konkláve hráč ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });

    try {
      const res = await createKonklaveCore();
      expect(res).toEqual({});

      const [konklave] = await db
        .select({ id: konklaves.id })
        .from(konklaves)
        .where(eq(konklaves.status, "active"))
        .limit(1);
      expect(konklave).toBeTruthy();

      const placements = await db
        .select({
          playerId: konklavePlacements.playerId,
          roomId: konklavePlacements.roomId,
        })
        .from(konklavePlacements)
        .where(eq(konklavePlacements.konklaveId, konklave.id));

      // Our in-game player got a placement...
      const mine = placements.find((p) => p.playerId === player.id);
      expect(mine).toBeTruthy();
      // ...and NO placement in this konkláve was assigned a room.
      expect(placements.length).toBeGreaterThan(0);
      expect(placements.every((p) => p.roomId === null)).toBe(true);

      // Cleanup: cascade removes the placements with the konkláve.
      await db.delete(konklaves).where(eq(konklaves.id, konklave.id));
    } finally {
      await db.delete(players).where(eq(players.id, player.id));
    }
  });
});
