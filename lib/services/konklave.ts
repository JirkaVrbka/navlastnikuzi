// Konkláve core logic — plain, session-less functions. The web actions
// (app/konklave/actions.ts) wrap each with requireUser + revalidatePath. Czech
// result messages live HERE. Each returns { error?: string } (empty object =
// success), mirroring lib/services/voting.ts. No MCP surface (web UI only).

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, rooms, konklaves, konklavePlacements } from "@/lib/db/schema";
import { roomSchema } from "@/lib/validation/konklave";
import type {
  PlacementCheckField,
  StartKonklaveInput,
  ReplaceKonklaveInput,
} from "@/lib/validation/konklave";

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

// Start a new konkláve from the builder: snapshot every in-game player as a
// placement in one transaction, applying the room/organizer the builder paired
// with each player (its `assignments`). Players not in `assignments` are still
// snapshotted with a null room/organizer; assignments for players who are not
// in game are ignored (no extra rows). One active at a time (service-level
// guard, like votings). Empty assignments reproduce the old "all unassigned"
// behavior. Errors if a konkláve is already active or no one is in game.
export async function createKonklaveWithPlacementsCore(
  input: StartKonklaveInput,
): Promise<{ error?: string }> {
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
    // Map assignments by playerId so each in-game player picks up its room +
    // organizer (or null). Assignments for non-in-game players never match, so
    // they're silently dropped — no placement row is created for them.
    const byPlayer = new Map(input.assignments.map((a) => [a.playerId, a]));
    await db.transaction(async (tx) => {
      const [konklave] = await tx
        .insert(konklaves)
        .values({ status: "active" })
        .returning({ id: konklaves.id });
      await tx.insert(konklavePlacements).values(
        inGame.map((p) => {
          const a = byPlayer.get(p.id);
          return {
            konklaveId: konklave.id,
            playerId: p.id,
            roomId: a?.roomId ?? null,
            organizerProfileId: a?.organizerProfileId ?? null,
          };
        }),
      );
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Tato místnost je přiřazena víc hráčům." };
    }
    return { error: "Nepodařilo se založit konkláve." };
  }
  return {};
}

// Replace ALL placements of the ACTIVE konkláve in place — the "Upravit →
// builder → uložit" round-trip. Re-assigns room + organizer per player while
// PRESERVING each player's progress (wentToRoom/cameBack); a player's two flags
// are reset ONLY if their room changed. No rows are inserted or deleted (one
// placement already exists per in-game player from create time), so the
// (konklave_id, player_id) unique index stays satisfied; assignments whose
// playerId has no existing placement are ignored.
export async function replaceKonklavePlacementsCore(
  input: ReplaceKonklaveInput,
): Promise<{ error?: string }> {
  try {
    // Guard: the target konkláve must exist AND still be active.
    const [active] = await db
      .select({ id: konklaves.id })
      .from(konklaves)
      .where(
        and(eq(konklaves.id, input.konklaveId), eq(konklaves.status, "active")),
      )
      .limit(1);
    if (!active) {
      return { error: "Konkláve již bylo ukončeno." };
    }

    const byPlayer = new Map(input.assignments.map((a) => [a.playerId, a]));
    await db.transaction(async (tx) => {
      // Read current placements before touching anything so we can compare the
      // new room against the old one (progress reset) per player.
      const current = await tx
        .select({
          id: konklavePlacements.id,
          playerId: konklavePlacements.playerId,
          roomId: konklavePlacements.roomId,
        })
        .from(konklavePlacements)
        .where(eq(konklavePlacements.konklaveId, input.konklaveId));

      // Clear every room FIRST so swapping rooms between two players can't
      // transiently collide on the partial unique (konklave_id, room_id) index.
      await tx
        .update(konklavePlacements)
        .set({ roomId: null })
        .where(eq(konklavePlacements.konklaveId, input.konklaveId));

      // Apply the new assignment to each EXISTING placement row (matched by
      // playerId). A player with no assignment clears to null room/organizer.
      for (const row of current) {
        const a = byPlayer.get(row.playerId);
        const newRoomId = a?.roomId ?? null;
        const newOrganizer = a?.organizerProfileId ?? null;
        const roomChanged = newRoomId !== row.roomId;
        await tx
          .update(konklavePlacements)
          .set({
            roomId: newRoomId,
            organizerProfileId: newOrganizer,
            // Room changed → reset progress; unchanged → leave flags as they are.
            ...(roomChanged ? { wentToRoom: false, cameBack: false } : {}),
          })
          .where(eq(konklavePlacements.id, row.id));
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Tato místnost je přiřazena víc hráčům." };
    }
    return { error: "Nepodařilo se uložit rozmístění." };
  }
  return {};
}

// A postgres unique-violation (SQLSTATE 23505). Direct queries surface the
// PostgresError itself; inside a transaction drizzle wraps it in a
// DrizzleQueryError whose `.cause` is the PostgresError — check both.
function isUniqueViolation(err: unknown): boolean {
  const hasCode = (e: unknown): boolean =>
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23505";
  return hasCode(err) || hasCode((err as { cause?: unknown } | null)?.cause);
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
