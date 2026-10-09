import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, closeDb } from "@/lib/db";
import {
  players,
  rooms,
  profiles,
  konklaves,
  konklavePlacements,
} from "@/lib/db/schema";
import {
  createKonklaveWithPlacementsCore,
  replaceKonklavePlacementsCore,
} from "@/lib/services/konklave";
import { isDbUp } from "./helpers/db";

// DB-backed (shared TEST stack, never reset). createKonklaveWithPlacementsCore
// has a global "one active at a time" guard and snapshots EVERY in-game player,
// so each test first archives any pre-existing active konkláve, then asserts
// only on rows it can attribute to the konkláve it created. Known players/rooms
// are created per test and cleaned up in a finally.
const dbUp = await isDbUp();

afterAll(async () => {
  if (dbUp) await closeDb();
});

// Archive any active konkláve left by earlier work so the one-active guard lets
// a fresh one start.
async function archiveActive() {
  await db
    .update(konklaves)
    .set({ status: "archived", finishedAt: new Date() })
    .where(eq(konklaves.status, "active"));
}

async function activeKonklaveId() {
  const [k] = await db
    .select({ id: konklaves.id })
    .from(konklaves)
    .where(eq(konklaves.status, "active"))
    .limit(1);
  return k?.id;
}

describe.skipIf(!dbUp)("createKonklaveWithPlacementsCore", () => {
  it("snapshots ALL in-game players, applying room/organizer from the payload and leaving others null", async () => {
    await archiveActive();

    const [placed] = await db
      .insert(players)
      .values({ name: `Konkláve A ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [other] = await db
      .insert(players)
      .values({ name: `Konkláve B ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [room] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });
    // Use a real organizer profile if one exists in the shared stack; otherwise
    // cover room assignment only and leave the organizer null (creating a
    // profile needs an auth.users row — out of scope here).
    const [organizer] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .limit(1);
    const organizerId = organizer?.id ?? null;

    try {
      const res = await createKonklaveWithPlacementsCore({
        assignments: [
          {
            playerId: placed.id,
            roomId: room.id,
            organizerProfileId: organizerId,
          },
        ],
      });
      expect(res).toEqual({});

      const konklaveId = await activeKonklaveId();
      expect(konklaveId).toBeTruthy();

      const placements = await db
        .select({
          playerId: konklavePlacements.playerId,
          roomId: konklavePlacements.roomId,
          organizerProfileId: konklavePlacements.organizerProfileId,
        })
        .from(konklavePlacements)
        .where(eq(konklavePlacements.konklaveId, konklaveId!));

      // The placed player carries the room + organizer from the payload.
      const mine = placements.find((p) => p.playerId === placed.id);
      expect(mine).toBeTruthy();
      expect(mine!.roomId).toBe(room.id);
      expect(mine!.organizerProfileId).toBe(organizerId);

      // The unlisted in-game player is still snapshotted, with null room/org.
      const theirs = placements.find((p) => p.playerId === other.id);
      expect(theirs).toBeTruthy();
      expect(theirs!.roomId).toBeNull();
      expect(theirs!.organizerProfileId).toBeNull();

      await db.delete(konklaves).where(eq(konklaves.id, konklaveId!));
    } finally {
      await db.delete(rooms).where(eq(rooms.id, room.id));
      await db
        .delete(players)
        .where(inArray(players.id, [placed.id, other.id]));
    }
  });

  it("rejects a duplicate room across two assignments (schema or unique violation surfaces a friendly error)", async () => {
    await archiveActive();

    const [p1] = await db
      .insert(players)
      .values({ name: `Konkláve C ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [p2] = await db
      .insert(players)
      .values({ name: `Konkláve D ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [room] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });

    try {
      const res = await createKonklaveWithPlacementsCore({
        assignments: [
          { playerId: p1.id, roomId: room.id, organizerProfileId: null },
          { playerId: p2.id, roomId: room.id, organizerProfileId: null },
        ],
      });
      // Either the schema refine or the DB unique index rejects it; both give a
      // friendly Czech message about a room assigned to more than one player.
      expect(res.error).toBeTruthy();
      expect(res.error).toContain("víc hráčům");

      // No konkláve should have been created.
      const konklaveId = await activeKonklaveId();
      expect(konklaveId).toBeFalsy();
    } finally {
      await db.delete(rooms).where(eq(rooms.id, room.id));
      await db.delete(players).where(inArray(players.id, [p1.id, p2.id]));
    }
  });

  it("rejects when a konkláve is already active", async () => {
    await archiveActive();

    const [player] = await db
      .insert(players)
      .values({ name: `Konkláve E ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });

    try {
      const first = await createKonklaveWithPlacementsCore({ assignments: [] });
      expect(first).toEqual({});

      const second = await createKonklaveWithPlacementsCore({
        assignments: [],
      });
      expect(second.error).toBe("Konkláve již probíhá.");

      const konklaveId = await activeKonklaveId();
      await db.delete(konklaves).where(eq(konklaves.id, konklaveId!));
    } finally {
      await db.delete(players).where(eq(players.id, player.id));
    }
  });

  it("empty assignments → every in-game player placed with null room/organizer", async () => {
    await archiveActive();

    const [player] = await db
      .insert(players)
      .values({ name: `Konkláve F ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });

    try {
      const res = await createKonklaveWithPlacementsCore({ assignments: [] });
      expect(res).toEqual({});

      const konklaveId = await activeKonklaveId();
      expect(konklaveId).toBeTruthy();

      const placements = await db
        .select({
          playerId: konklavePlacements.playerId,
          roomId: konklavePlacements.roomId,
          organizerProfileId: konklavePlacements.organizerProfileId,
        })
        .from(konklavePlacements)
        .where(eq(konklavePlacements.konklaveId, konklaveId!));

      const mine = placements.find((p) => p.playerId === player.id);
      expect(mine).toBeTruthy();
      expect(placements.length).toBeGreaterThan(0);
      expect(
        placements.every(
          (p) => p.roomId === null && p.organizerProfileId === null,
        ),
      ).toBe(true);

      await db.delete(konklaves).where(eq(konklaves.id, konklaveId!));
    } finally {
      await db.delete(players).where(eq(players.id, player.id));
    }
  });
});

describe.skipIf(!dbUp)("replaceKonklavePlacementsCore", () => {
  it("resets a player's flags when their room changes but keeps them when the room is unchanged", async () => {
    await archiveActive();

    const [moved] = await db
      .insert(players)
      .values({ name: `Konkláve G ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [stayed] = await db
      .insert(players)
      .values({ name: `Konkláve H ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [room1] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });
    const [room2] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });
    const [room3] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });

    try {
      // Start: moved → room1, stayed → room2.
      const start = await createKonklaveWithPlacementsCore({
        assignments: [
          { playerId: moved.id, roomId: room1.id, organizerProfileId: null },
          { playerId: stayed.id, roomId: room2.id, organizerProfileId: null },
        ],
      });
      expect(start).toEqual({});
      const konklaveId = (await activeKonklaveId())!;

      // Mark BOTH players as in-room + back so we can prove preservation.
      await db
        .update(konklavePlacements)
        .set({ wentToRoom: true, cameBack: true })
        .where(eq(konklavePlacements.konklaveId, konklaveId));

      // Replace: move `moved` to room3 (a DIFFERENT room); `stayed` keeps room2.
      const res = await replaceKonklavePlacementsCore({
        konklaveId,
        assignments: [
          { playerId: moved.id, roomId: room3.id, organizerProfileId: null },
          { playerId: stayed.id, roomId: room2.id, organizerProfileId: null },
        ],
      });
      expect(res).toEqual({});

      const rows = await db
        .select({
          playerId: konklavePlacements.playerId,
          roomId: konklavePlacements.roomId,
          wentToRoom: konklavePlacements.wentToRoom,
          cameBack: konklavePlacements.cameBack,
        })
        .from(konklavePlacements)
        .where(eq(konklavePlacements.konklaveId, konklaveId));

      const movedRow = rows.find((r) => r.playerId === moved.id)!;
      expect(movedRow.roomId).toBe(room3.id);
      // Room changed → flags reset.
      expect(movedRow.wentToRoom).toBe(false);
      expect(movedRow.cameBack).toBe(false);

      const stayedRow = rows.find((r) => r.playerId === stayed.id)!;
      expect(stayedRow.roomId).toBe(room2.id);
      // Room unchanged → flags preserved.
      expect(stayedRow.wentToRoom).toBe(true);
      expect(stayedRow.cameBack).toBe(true);

      await db.delete(konklaves).where(eq(konklaves.id, konklaveId));
    } finally {
      await db
        .delete(rooms)
        .where(inArray(rooms.id, [room1.id, room2.id, room3.id]));
      await db
        .delete(players)
        .where(inArray(players.id, [moved.id, stayed.id]));
    }
  });

  it("swaps two players' rooms without a unique violation (clear-first)", async () => {
    await archiveActive();

    const [a] = await db
      .insert(players)
      .values({ name: `Konkláve I ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [b] = await db
      .insert(players)
      .values({ name: `Konkláve J ${randomUUID()}`, inGame: true })
      .returning({ id: players.id });
    const [room1] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });
    const [room2] = await db
      .insert(rooms)
      .values({ name: `Pokoj ${randomUUID()}` })
      .returning({ id: rooms.id });

    try {
      const start = await createKonklaveWithPlacementsCore({
        assignments: [
          { playerId: a.id, roomId: room1.id, organizerProfileId: null },
          { playerId: b.id, roomId: room2.id, organizerProfileId: null },
        ],
      });
      expect(start).toEqual({});
      const konklaveId = (await activeKonklaveId())!;

      // Swap: a ↔ b. Clear-first must avoid a transient 23505 on the partial
      // unique (konklave_id, room_id) index.
      const res = await replaceKonklavePlacementsCore({
        konklaveId,
        assignments: [
          { playerId: a.id, roomId: room2.id, organizerProfileId: null },
          { playerId: b.id, roomId: room1.id, organizerProfileId: null },
        ],
      });
      expect(res).toEqual({});

      const rows = await db
        .select({
          playerId: konklavePlacements.playerId,
          roomId: konklavePlacements.roomId,
        })
        .from(konklavePlacements)
        .where(eq(konklavePlacements.konklaveId, konklaveId));
      expect(rows.find((r) => r.playerId === a.id)!.roomId).toBe(room2.id);
      expect(rows.find((r) => r.playerId === b.id)!.roomId).toBe(room1.id);

      await db.delete(konklaves).where(eq(konklaves.id, konklaveId));
    } finally {
      await db.delete(rooms).where(inArray(rooms.id, [room1.id, room2.id]));
      await db.delete(players).where(inArray(players.id, [a.id, b.id]));
    }
  });

  it("rejects when the konkláve is not active", async () => {
    await archiveActive();

    // An archived (non-active) konkláve id — a freshly created+archived row.
    const [konklave] = await db
      .insert(konklaves)
      .values({ status: "archived", finishedAt: new Date() })
      .returning({ id: konklaves.id });

    try {
      const res = await replaceKonklavePlacementsCore({
        konklaveId: konklave.id,
        assignments: [],
      });
      expect(res.error).toBe("Konkláve již bylo ukončeno.");
    } finally {
      await db.delete(konklaves).where(eq(konklaves.id, konklave.id));
    }
  });
});
