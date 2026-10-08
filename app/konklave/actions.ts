"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  createRoomCore,
  updateRoomCore,
  deleteRoomCore,
  createKonklaveCore,
  updatePlacementCore,
  setPlacementCheckCore,
  finishKonklaveCore,
} from "@/lib/services/konklave";
import {
  placementCheckFieldSchema,
  type PlacementPatch,
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
export async function createKonklave(): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const result = await createKonklaveCore();
  if (!result.error) {
    revalidatePath("/konklave");
    revalidatePath("/");
  }
  return result;
}

export async function updatePlacement(
  placementId: string,
  patch: PlacementPatch,
): Promise<{ error?: string }> {
  await requireUser();
  const result = await updatePlacementCore(placementId, patch);
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
