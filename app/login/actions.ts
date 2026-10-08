"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error: string };

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Allow logging in with just the local-part — append the shared domain when
  // the input has no "@" (e.g. "martini" → "martini@navlastnikuzi.local").
  const rawEmail = String(formData.get("email") ?? "").trim();
  const email =
    rawEmail && !rawEmail.includes("@")
      ? `${rawEmail}@navlastnikuzi.local`
      : rawEmail;

  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Zadejte platný e-mail a heslo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Nesprávný e-mail nebo heslo." };
  }

  redirect("/");
}
