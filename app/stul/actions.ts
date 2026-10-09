"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  assignSeatCore,
  clearSeatCore,
  swapSeatsCore,
} from "@/lib/services/table";
import {
  assignSeatSchema,
  clearSeatSchema,
  swapSeatsSchema,
} from "@/lib/validation/table";

// Shared gate: logged in AND admin. Returns an error object the caller forwards,
// mirroring the admin-gated konkláve actions.
async function adminGate(): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };
  return {};
}

export async function assignSeat(
  payload: unknown,
): Promise<{ error?: string }> {
  const gate = await adminGate();
  if (gate.error) return gate;
  const parsed = assignSeatSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const result = await assignSeatCore(
    parsed.data.seatNumber,
    parsed.data.playerId,
  );
  if (!result.error) revalidatePath("/stul");
  return result;
}

export async function clearSeat(payload: unknown): Promise<{ error?: string }> {
  const gate = await adminGate();
  if (gate.error) return gate;
  const parsed = clearSeatSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const result = await clearSeatCore(parsed.data.seatNumber);
  if (!result.error) revalidatePath("/stul");
  return result;
}

export async function swapSeats(payload: unknown): Promise<{ error?: string }> {
  const gate = await adminGate();
  if (gate.error) return gate;
  const parsed = swapSeatsSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const result = await swapSeatsCore(parsed.data.seatA, parsed.data.seatB);
  if (!result.error) revalidatePath("/stul");
  return result;
}
