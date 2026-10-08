"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, isAdmin } from "@/lib/auth";
import { bankEntrySchema } from "@/lib/validation/bank";
import {
  createBankEntryCore,
  updateBankEntryCore,
  deleteBankEntryCore,
} from "@/lib/services/bank";

// Shape the raw form values come in as. `profit`/`potential` are coerced by
// bankEntrySchema, so strings from inputs are fine; leave `potential` undefined
// (omit it) when the field is blank — it then defaults to `profit` in the schema.
// Passing null/"" would coerce to 0 and fail the potential ≥ profit rule.
type BankEntryFields = {
  mission: unknown;
  profit: unknown;
  potential?: unknown;
};

// All three actions take a typed object argument (not FormData) and return
// { error?: string } — no error means success. The Banka dialog/row controls call
// them directly inside a useTransition and read `result?.error` for inline errors
// (mirrors app/zpovedi/actions.ts).

// uuid gate shared by update/delete.
const idSchema = z.string().uuid();

// addBankEntry(fields: { mission; profit; potential? }): Promise<{ error?: string }>
export async function addBankEntry(
  fields: BankEntryFields,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };

  const parsed = bankEntrySchema.safeParse(fields);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const res = await createBankEntryCore({
    mission: parsed.data.mission,
    profit: parsed.data.profit,
    potential: parsed.data.potential,
  });
  if ("error" in res) return { error: res.error };

  revalidatePath("/banka");
  return {};
}

// updateBankEntry(id: string, fields: { mission; profit; potential? }): Promise<{ error?: string }>
export async function updateBankEntry(
  id: string,
  fields: BankEntryFields,
): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Neplatný záznam." };

  const parsed = bankEntrySchema.safeParse(fields);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const res = await updateBankEntryCore({
    id: parsedId.data,
    mission: parsed.data.mission,
    profit: parsed.data.profit,
    potential: parsed.data.potential,
  });
  if ("error" in res) return { error: res.error };

  revalidatePath("/banka");
  return {};
}

// deleteBankEntry(id: string): Promise<{ error?: string }>
export async function deleteBankEntry(id: string): Promise<{ error?: string }> {
  await requireUser();
  if (!(await isAdmin())) return { error: "Nedostatečná oprávnění." };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Neplatný záznam." };

  const res = await deleteBankEntryCore({ id: parsedId.data });
  if ("error" in res) return { error: res.error };

  revalidatePath("/banka");
  return {};
}
