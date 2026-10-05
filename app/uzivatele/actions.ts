"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createUserSchema } from "@/lib/validation/auth";
import { createUserCore } from "@/lib/services/users";

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

  // Shared account-creation core. This action is admin-only (requireAdmin above),
  // so elevating to 'admin' here is authorized; role is never derived from client
  // metadata (the signup trigger always provisions the profile as 'organizer').
  const res = await createUserCore({
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
    displayName: parsed.data.displayName ?? null,
  });
  if ("error" in res) {
    return { error: res.error, success: "" };
  }

  revalidatePath("/uzivatele");
  return { error: "", success: "Uživatel byl vytvořen." };
}
