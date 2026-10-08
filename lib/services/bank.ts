import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankEntries } from "@/lib/db/schema";

// Banka core mutations — plain, session-less functions wrapped by the web actions
// (app/banka/actions.ts), which add requireUser + Zod + revalidatePath. Callers
// pass already-validated values (potential defaulted/checked by bankEntrySchema).
// Czech result messages live HERE. One global bank; server-only (owner DB
// connection). Mirrors the { ok: true } | { error: string } style of
// lib/services/users.ts.

// Insert a new mission entry.
export async function createBankEntryCore({
  mission,
  profit,
  potential,
}: {
  mission: string;
  profit: number;
  potential: number;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await db.insert(bankEntries).values({ mission, profit, potential });
  } catch {
    return { error: "Nepodařilo se uložit záznam." };
  }
  return { ok: true };
}

// Update a mission entry by id. No matching row → friendly Czech message.
export async function updateBankEntryCore({
  id,
  mission,
  profit,
  potential,
}: {
  id: string;
  mission: string;
  profit: number;
  potential: number;
}): Promise<{ ok: true } | { error: string }> {
  try {
    const updated = await db
      .update(bankEntries)
      .set({ mission, profit, potential })
      .where(eq(bankEntries.id, id))
      .returning({ id: bankEntries.id });
    if (updated.length === 0) {
      return { error: "Záznam nenalezen." };
    }
  } catch {
    return { error: "Nepodařilo se uložit záznam." };
  }
  return { ok: true };
}

// Delete a mission entry by id. No matching row → friendly Czech message.
export async function deleteBankEntryCore({
  id,
}: {
  id: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    const deleted = await db
      .delete(bankEntries)
      .where(eq(bankEntries.id, id))
      .returning({ id: bankEntries.id });
    if (deleted.length === 0) {
      return { error: "Záznam nenalezen." };
    }
  } catch {
    return { error: "Nepodařilo se smazat záznam." };
  }
  return { ok: true };
}
