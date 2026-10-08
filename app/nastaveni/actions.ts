"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  updateNameSchema,
  updatePasswordSchema,
} from "@/lib/validation/account";
import type { ActionState } from "./types";

const ok = (success = ""): ActionState => ({ error: "", success });
const fail = (error: string): ActionState => ({ error, success: "" });

// Change the current user's display name on their own profile row.
export async function updateName(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateNameSchema.safeParse({
    displayName: fd.get("displayName"),
  });
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Neplatné údaje.");
  try {
    await db
      .update(profiles)
      .set({ displayName: parsed.data.displayName })
      .where(eq(profiles.id, user.id));
  } catch {
    return fail("Nepodařilo se uložit jméno.");
  }
  revalidatePath("/");
  revalidatePath("/nastaveni");
  return ok("Jméno bylo uloženo.");
}

// Change the current user's password via Supabase Auth.
export async function updatePassword(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = updatePasswordSchema.safeParse({
    password: fd.get("password"),
    confirm: fd.get("confirm"),
  });
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Neplatné údaje.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return fail("Nepodařilo se změnit heslo.");
  return ok("Heslo bylo změněno.");
}
