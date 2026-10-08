"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  createConfessionCore,
  setPlacementSideCore,
  setPlacementDoneCore,
  setPlacementNoteCore,
  finishConfessionCore,
} from "@/lib/services/confession";
import { sideSchema } from "@/lib/validation/confession";

// Start a new zpověď (splits in-game players across the two columns).
export async function createConfession(): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const result = await createConfessionCore();
  if (!result.error) revalidatePath("/zpovedi");
  return result;
}

// Move a placement to the other column (optimistic on the client).
export async function setPlacementSide(
  placementId: string,
  side: "a" | "b",
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const parsed = sideSchema.safeParse(side);
  if (!parsed.success) return { error: "Neplatný sloupec." };
  const result = await setPlacementSideCore(placementId, parsed.data);
  if (!result.error) revalidatePath("/zpovedi");
  return result;
}

// Toggle a placement's "Hotovo" flag.
export async function setPlacementDone(
  placementId: string,
  value: boolean,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const result = await setPlacementDoneCore(placementId, value);
  if (!result.error) revalidatePath("/zpovedi");
  return result;
}

// Persist a placement's per-zpověď note.
export async function setPlacementNote(
  placementId: string,
  note: string,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const result = await setPlacementNoteCore(placementId, note);
  if (!result.error) revalidatePath("/zpovedi");
  return result;
}

// Finish (archive) the active zpověď.
export async function finishConfession(
  confessionId: string,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  const result = await finishConfessionCore(confessionId);
  if (!result.error) revalidatePath("/zpovedi");
  return result;
}
