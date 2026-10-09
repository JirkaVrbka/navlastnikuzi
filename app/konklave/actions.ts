"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  createRoomCore,
  updateRoomCore,
  deleteRoomCore,
  createKonklaveWithPlacementsCore,
  replaceKonklavePlacementsCore,
  setPlacementCheckCore,
  finishKonklaveCore,
} from "@/lib/services/konklave";
import {
  placementCheckFieldSchema,
  startKonklaveSchema,
  replaceKonklaveSchema,
} from "@/lib/validation/konklave";
import type { ActionState } from "./types";

const ok = (success = ""): ActionState => ({ error: "", success });
const fail = (error: string): ActionState => ({ error, success: "" });

// ── Rooms (form actions, mirror createDay/updateDay/deleteDay) ──────────────
export async function createRoom(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser();
  const result = await createRoomCore(String(fd.get("name") ?? ""));
  if (result.error) return fail(result.error);
  revalidatePath("/konklave");
  return ok("Místnost byla vytvořena.");
}

export async function updateRoom(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return fail("Chybí identifikátor místnosti.");
  const result = await updateRoomCore(id, String(fd.get("name") ?? ""));
  if (result.error) return fail(result.error);
  revalidatePath("/konklave");
  return ok("Místnost byla uložena.");
}

export async function deleteRoom(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  await deleteRoomCore(id);
  revalidatePath("/konklave");
}

// ── Konkláve (voting-style; {error?} for live/toggle ones) ──────────────────
// Start a konkláve from the drag-and-drop builder's payload (one entry per
// placed player). Admin-gated + validated (strict 1:1 on players/rooms).
export async function startKonklave(
  payload: unknown,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const parsed = startKonklaveSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const result = await createKonklaveWithPlacementsCore(parsed.data);
  if (!result.error) {
    revalidatePath("/konklave");
    revalidatePath("/");
  }
  return result;
}

// Replace the active konkláve's placements in place (edit via the builder).
// Admin-gated + validated (strict 1:1 on players/rooms); keeps each player's
// progress unless their room changed (handled in the core).
export async function replaceKonklavePlacements(
  payload: unknown,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const parsed = replaceKonklaveSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const result = await replaceKonklavePlacementsCore(parsed.data);
  if (!result.error) {
    revalidatePath("/konklave");
    revalidatePath("/");
  }
  return result;
}

export async function setPlacementCheck(
  placementId: string,
  field: "wentToRoom" | "cameBack",
  value: boolean,
): Promise<{ error?: string }> {
  await requireUser();
  const parsed = placementCheckFieldSchema.safeParse(field);
  if (!parsed.success) return { error: "Neplatné pole." };
  const result = await setPlacementCheckCore(placementId, parsed.data, value);
  if (!result.error) {
    revalidatePath("/konklave");
    revalidatePath("/");
  }
  return result;
}

export async function finishKonklave(
  konklaveId: string,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const result = await finishKonklaveCore(konklaveId);
  if (!result.error) {
    revalidatePath("/konklave");
    revalidatePath("/");
  }
  return result;
}
