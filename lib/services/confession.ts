// Zpověď core logic — plain, session-less functions. The web actions
// (app/zpovedi/actions.ts) wrap each with requireUser + revalidatePath. Czech
// result messages live HERE. Each returns { error?: string } (empty object =
// success), mirroring lib/services/konklave.ts. No MCP surface (web UI only).

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, confessions, confessionPlacements } from "@/lib/db/schema";
import { noteSchema, type Side } from "@/lib/validation/confession";

// Fisher–Yates in place, fresh Math.random each call (non-deterministic order).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Start a new zpověď: snapshot every in-game player as a placement in one
// transaction. Players are shuffled, then split into two balanced halves (sizes
// equal or ±1) — the first half gets side 'a', the rest side 'b'. The split is
// different each call (non-deterministic). One active at a time (service-level
// guard, like konkláves). Errors if a zpověď is already active or no one is in
// game.
export async function createConfessionCore(): Promise<{ error?: string }> {
  try {
    const alreadyActive = await db
      .select({ id: confessions.id })
      .from(confessions)
      .where(eq(confessions.status, "active"))
      .limit(1);
    if (alreadyActive.length > 0) {
      return { error: "Zpověď již probíhá." };
    }
    const inGame = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.inGame, true));
    if (inGame.length === 0) {
      return { error: "Žádní hráči ve hře — není koho rozdělit." };
    }
    const shuffled = shuffle(inGame);
    // First half (ceil) → column A, the rest → column B, so the two columns are
    // equal or differ by one player.
    const half = Math.ceil(shuffled.length / 2);

    await db.transaction(async (tx) => {
      const [confession] = await tx
        .insert(confessions)
        .values({ status: "active" })
        .returning({ id: confessions.id });
      await tx.insert(confessionPlacements).values(
        shuffled.map((p, i) => ({
          confessionId: confession.id,
          playerId: p.id,
          side: i < half ? "a" : "b",
        })),
      );
    });
  } catch {
    return { error: "Nepodařilo se založit zpověď." };
  }
  return {};
}

// Move a placement to the other column — only while the parent zpověď is active.
export async function setPlacementSideCore(
  placementId: string,
  side: Side,
): Promise<{ error?: string }> {
  return updateActivePlacement(placementId, { side });
}

// Toggle a placement's "Hotovo" flag — only while active.
export async function setPlacementDoneCore(
  placementId: string,
  value: boolean,
): Promise<{ error?: string }> {
  return updateActivePlacement(placementId, { done: value });
}

// Set a placement's per-zpověď note — only while active. Trims; empty → null.
export async function setPlacementNoteCore(
  placementId: string,
  note: string,
): Promise<{ error?: string }> {
  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatná poznámka." };
  }
  return updateActivePlacement(placementId, { note: parsed.data || null });
}

// Shared writer: apply a patch to a placement in ONE atomic guarded UPDATE that
// only matches while the parent confession is still active (EXISTS guard, like
// konkláve's updatePlacementCore). This closes the TOCTOU race with
// finishConfessionCore — no check-then-write gap. A 0-row result means the
// zpověď is already finished (or the placement is gone) → friendly Czech message.
async function updateActivePlacement(
  placementId: string,
  set: Partial<{ side: Side; done: boolean; note: string | null }>,
): Promise<{ error?: string }> {
  try {
    const updated = await db
      .update(confessionPlacements)
      .set(set)
      .where(
        and(
          eq(confessionPlacements.id, placementId),
          sql`EXISTS (SELECT 1 FROM ${confessions} WHERE ${confessions.id} = ${confessionPlacements.confessionId} AND ${confessions.status} = 'active')`,
        ),
      )
      .returning({ id: confessionPlacements.id });
    if (updated.length === 0) {
      return { error: "Zpověď již byla ukončena." };
    }
  } catch {
    return { error: "Nepodařilo se uložit změnu." };
  }
  return {};
}

// Finish a zpověď ATOMICALLY: lock the still-active row, archive it + stamp
// finishedAt. Missing/already-archived → friendly message (mirrors konkláve).
export async function finishConfessionCore(
  confessionId: string,
): Promise<{ error?: string }> {
  try {
    const result = await db.transaction(
      async (tx): Promise<{ error?: string }> => {
        const [confession] = await tx
          .select({ id: confessions.id })
          .from(confessions)
          .where(
            and(
              eq(confessions.id, confessionId),
              eq(confessions.status, "active"),
            ),
          )
          .for("update");
        if (!confession) {
          return { error: "Zpověď již byla ukončena." };
        }
        await tx
          .update(confessions)
          .set({ status: "archived", finishedAt: new Date() })
          .where(eq(confessions.id, confessionId));
        return {};
      },
    );
    return result;
  } catch {
    return { error: "Nepodařilo se ukončit zpověď." };
  }
}
