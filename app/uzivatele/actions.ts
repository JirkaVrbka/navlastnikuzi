"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema } from "@/lib/validation/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type CreateUserState = { error: string; success: string };

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireAdmin();

  const displayNameRaw = formData.get("displayName");
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    displayName: displayNameRaw ? String(displayNameRaw) : undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Neplatné údaje.",
      success: "",
    };
  }

  const admin = createAdminClient();
  // The signup trigger always creates the profile as 'organizer' (it never trusts
  // client metadata for role). Display name is safe to pass through.
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName ?? null },
  });

  if (error) {
    const already = /already|exist/i.test(error.message);
    return {
      error: already
        ? "Uživatel s tímto e-mailem už existuje."
        : "Nepodařilo se vytvořit uživatele.",
      success: "",
    };
  }

  // Set the role explicitly here — this action is admin-only (requireAdmin above),
  // so elevating to 'admin' is authorized. Never derived from client metadata.
  const userId = data.user?.id;
  if (userId && parsed.data.role !== "organizer") {
    await db
      .update(profiles)
      .set({ role: parsed.data.role })
      .where(eq(profiles.id, userId));
  }

  revalidatePath("/uzivatele");
  return { error: "", success: "Uživatel byl vytvořen." };
}
