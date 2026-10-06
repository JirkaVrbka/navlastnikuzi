import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

// Account-creation core — a plain, session-less function shared by the web server
// action (app/uzivatele/actions.ts) and the MCP tool (lib/mcp/tools.ts). The web
// action adds requireAdmin + Zod + revalidatePath; the MCP tool adds the bearer
// gate. The Czech result messages live HERE so both paths are identical. It uses
// the service-role admin client (SERVER-ONLY) and the owner DB connection, so this
// module is server-only — mirroring lib/supabase/admin.ts.

// Create a login account at the given role. The signup trigger always provisions
// the profile as 'organizer' (it never trusts client metadata for role); when a
// higher role is requested, the profile row is elevated explicitly afterwards —
// the CALLER is responsible for authorizing that. Returns the new user id, or a
// Czech error message (duplicate e-mail vs. generic failure).
export async function createUserCore({
  email,
  password,
  role,
  displayName,
}: {
  email: string;
  password: string;
  role: "admin" | "organizer";
  displayName?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient();
  // Always provision a name: use the given one (trimmed) or derive it from the
  // e-mail local-part, so the UI (name-first everywhere) never falls back to email.
  const name = displayName?.trim() ? displayName.trim() : email.split("@")[0];
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });

  if (error) {
    const already = /already|exist/i.test(error.message);
    return {
      error: already
        ? "Uživatel s tímto e-mailem už existuje."
        : "Nepodařilo se vytvořit uživatele.",
    };
  }

  const userId = data.user?.id;
  if (!userId) return { error: "Nepodařilo se vytvořit uživatele." };

  // Only elevate for a non-default role; 'organizer' is already set by the trigger.
  if (role !== "organizer") {
    await db.update(profiles).set({ role }).where(eq(profiles.id, userId));
  }

  return { id: userId };
}

// A strong random password for accounts created without one (24 bytes of entropy,
// base64url so it stays header/URL/copy-paste safe). randomBytes is reused the
// same way as lib/mcp/tokens.ts.
export function generatePassword(): string {
  return randomBytes(24).toString("base64url");
}
