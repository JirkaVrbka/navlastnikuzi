// Konkláve core logic — plain, session-less functions. The web actions
// (app/konklave/actions.ts) wrap each with requireUser + revalidatePath. Czech
// result messages live HERE. Each returns { error?: string } (empty object =
// success), mirroring lib/services/voting.ts. No MCP surface (web UI only).

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, rooms, konklaves, konklavePlacements } from "@/lib/db/schema";
import { roomSchema } from "@/lib/validation/konklave";
import type { PlacementCheckField } from "@/lib/validation/konklave";

// ── Rooms (free-text CRUD, mirrors the days CRUD) ───────────────────────────
export async function createRoomCore(
  name: string,
): Promise<{ error?: string }> {
  const parsed = roomSchema.safeParse({ name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  try {
    await db.insert(rooms).values({ name: parsed.data.name });
  } catch {
    return { error: "Nepodařilo se vytvořit místnost." };
  }
  return {};
}

export async function updateRoomCore(
  id: string,
  name: string,
): Promise<{ error?: string }> {
  const parsed = roomSchema.safeParse({ name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  try {
    const upd = await db
      .update(rooms)
      .set({ name: parsed.data.name })
      .where(eq(rooms.id, id))
      .returning({ id: rooms.id });
    if (upd.length === 0) return { error: "Místnost již neexistuje." };
  } catch {
    return { error: "Nepodařilo se uložit místnost." };
  }
  return {};
}

export async function deleteRoomCore(id: string): Promise<{ error?: string }> {
  try {
    // Placements reference rooms with ON DELETE SET NULL, so a room can always
    // be removed; existing placements just lose their room assignment.
    await db.delete(rooms).where(eq(rooms.id, id));
  } catch {
    return { error: "Nepodařilo se odstranit místnost." };
  }
  return {};
}

// ── Konkláve ────────────────────────────────────────────────────────────────

// Fisher–Yates in place, fresh Math.random each call (non-deterministic order).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Start a new konkláve: snapshot every in-game player as a placement in one
// transaction. Rooms are shuffled and assigned distinct to players in order;
// extras (more players than rooms) stay unassigned. One active at a time
// (service-level guard, like votings). Errors if a konkláve is already active
// or no one is in game.
export async function createKonklaveCore(): Promise<{ error?: string }> {
  try {
    const alreadyActive = await db
      .select({ id: konklaves.id })
      .from(konklaves)
      .where(eq(konklaves.status, "active"))
      .limit(1);
    if (alreadyActive.length > 0) {
      return { error: "Konkláve již probíhá." };
    }
    const inGame = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.inGame, true));
    if (inGame.length === 0) {
      return { error: "Žádní hráči ve hře — není koho rozmístit." };
    }
    const allRooms = await db.select({ id: rooms.id }).from(rooms);
    const shuffledRooms = shuffle(allRooms);

    await db.transaction(async (tx) => {
      const [konklave] = await tx
        .insert(konklaves)
        .values({ status: "active" })
        .returning({ id: konklaves.id });
      await tx.insert(konklavePlacements).values(
        inGame.map((p, i) => ({
          konklaveId: konklave.id,
          playerId: p.id,
          roomId: shuffledRooms[i]?.id ?? null,
        })),
      );
    });
  } catch {
    return { error: "Nepodařilo se založit konkláve." };
  }
  return {};
}

// A postgres unique-violation (SQLSTATE 23505).
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

// Change a placement's room and/or organizer — only while the parent konkláve
// is active (EXISTS guard, like castVoteCore). Applies only the provided
// fields. A room already taken by another placement in this konkláve violates
// the partial unique index → friendly message.
export async function updatePlacementCore(
  placementId: string,
  patch: { roomId?: string | null; organizerProfileId?: string | null },
): Promise<{ error?: string }> {
  const set: Partial<{
    roomId: string | null;
    organizerProfileId: string | null;
  }> = {};
  if ("roomId" in patch) set.roomId = patch.roomId ?? null;
  if ("organizerProfileId" in patch)
    set.organizerProfileId = patch.organizerProfileId ?? null;
  if (Object.keys(set).length === 0) return {};
  try {
    const updated = await db
      .update(konklavePlacements)
      .set(set)
      .where(
        and(
          eq(konklavePlacements.id, placementId),
          sql`EXISTS (SELECT 1 FROM ${konklaves} WHERE ${konklaves.id} = ${konklavePlacements.konklaveId} AND ${konklaves.status} = 'active')`,
        ),
      )
      .returning({ id: konklavePlacements.id });
    if (updated.length === 0) {
      return { error: "Konkláve již bylo ukončeno." };
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Tato místnost je už přiřazena jinému hráči." };
    }
    return { error: "Nepodařilo se uložit umístění." };
  }
  return {};
}

// Toggle one of a placement's two boolean checks, only while active. The two
// checks have a dependency (enforced here so the konkláve page and the home
// section always agree): "Zpět u stolu" (cameBack) only makes sense once the
// player is in the room (wentToRoom), and leaving the room clears it.
//   • wentToRoom = false  → also clears cameBack (same UPDATE).
//   • cameBack   = true   → rejected unless wentToRoom is currently true.
//   • wentToRoom = true / cameBack = false → unchanged.
export async function setPlacementCheckCore(
  placementId: string,
  field: PlacementCheckField,
  value: boolean,
): Promise<{ error?: string }> {
  // Coming back requires being in the room first — pre-check so we can return
  // the specific Czech message (a 0-row UPDATE can't tell this apart from an
  // already-finished konkláve).
  if (field === "cameBack" && value) {
    const [row] = await db
      .select({ wentToRoom: konklavePlacements.wentToRoom })
      .from(konklavePlacements)
      .where(eq(konklavePlacements.id, placementId))
      .limit(1);
    if (!row?.wentToRoom) {
      return { error: "Hráč ještě není v místnosti." };
    }
  }

  // Leaving the room (wentToRoom=false) clears "Zpět" in the same UPDATE.
  const set =
    field === "wentToRoom"
      ? value
        ? { wentToRoom: true }
        : { wentToRoom: false, cameBack: false }
      : { cameBack: value };
  try {
    const updated = await db
      .update(konklavePlacements)
      .set(set)
      .where(
        and(
          eq(konklavePlacements.id, placementId),
          sql`EXISTS (SELECT 1 FROM ${konklaves} WHERE ${konklaves.id} = ${konklavePlacements.konklaveId} AND ${konklaves.status} = 'active')`,
        ),
      )
      .returning({ id: konklavePlacements.id });
    if (updated.length === 0) {
      return { error: "Konkláve již bylo ukončeno." };
    }
  } catch {
    return { error: "Nepodařilo se uložit umístění." };
  }
  return {};
}

// Finish a konkláve ATOMICALLY: lock the still-active row, archive it + stamp
// finishedAt. Missing/already-archived → friendly message (mirrors endVoting).
export async function finishKonklaveCore(
  konklaveId: string,
): Promise<{ error?: string }> {
  try {
    const result = await db.transaction(
      async (tx): Promise<{ error?: string }> => {
        const [konklave] = await tx
          .select({ id: konklaves.id })
          .from(konklaves)
          .where(
            and(eq(konklaves.id, konklaveId), eq(konklaves.status, "active")),
          )
          .for("update");
        if (!konklave) {
          return { error: "Konkláve již bylo ukončeno." };
        }
        await tx
          .update(konklaves)
          .set({ status: "archived", finishedAt: new Date() })
          .where(eq(konklaves.id, konklaveId));
        return {};
      },
    );
    return result;
  } catch {
    return { error: "Nepodařilo se ukončit konkláve." };
  }
}
