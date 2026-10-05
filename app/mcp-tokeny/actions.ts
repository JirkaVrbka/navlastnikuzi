"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createTokenSchema } from "@/lib/validation/mcp";
import { generateToken, hashToken } from "@/lib/mcp/tokens";
import { db } from "@/lib/db";
import { mcpTokens } from "@/lib/db/schema";

// The create result carries the plaintext token ONCE (on success) so the form
// can show it. It is never stored or returned again.
export type CreateTokenState = {
  error: string;
  success: string;
  token?: string;
};

export async function createToken(
  _prevState: CreateTokenState,
  formData: FormData,
): Promise<CreateTokenState> {
  const admin = await requireAdmin();

  const parsed = createTokenSchema.safeParse({ label: formData.get("label") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Neplatné údaje.",
      success: "",
    };
  }

  // Mint the plaintext, store only its hash + who created it.
  const raw = generateToken();
  await db.insert(mcpTokens).values({
    label: parsed.data.label,
    tokenHash: hashToken(raw),
    createdBy: admin.id,
  });

  revalidatePath("/mcp-tokeny");
  return { error: "", success: "Token byl vytvořen.", token: raw };
}

// Revoke (soft-delete) a token by id — it stops authenticating immediately.
export async function revokeToken(formData: FormData): Promise<void> {
  await requireAdmin();

  // Guard the id before it reaches the uuid column: a non-UUID value would make
  // Postgres throw "invalid input syntax for type uuid" (a 500) instead of a
  // clean no-op.
  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) return;
  const id = parsed.data;

  await db
    .update(mcpTokens)
    .set({ revokedAt: new Date() })
    .where(eq(mcpTokens.id, id));

  revalidatePath("/mcp-tokeny");
}
