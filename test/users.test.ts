import { describe, it, expect, afterEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { setUserRoleCore } from "@/lib/services/users";
import { db, closeDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDbUp } from "./helpers/db";

// Integration tests for the role-change core, run against the shared Supabase
// TEST stack (never reset). The stack seeds exactly one admin
// (admin@navlastnikuzi.local); every account this suite creates is demoted back
// to organizer after each test, so that single-admin baseline — which the
// last-admin guard relies on — is always restored. actorId is never looked up by
// the core (only compared for the self-change guard), so a random uuid is a fine
// stand-in for the acting admin where its identity does not matter.
const dbUp = await isDbUp();

const created: string[] = [];

// Create a login account (the signup trigger provisions the profile as
// 'organizer'); elevate to admin when asked. Returns the new profile id.
async function makeUser(role: "admin" | "organizer"): Promise<string> {
  const { data, error } = await createAdminClient().auth.admin.createUser({
    email: `role-${randomUUID()}@test.local`,
    password: `${randomUUID()}Aa1!`,
    email_confirm: true,
  });
  if (error || !data.user)
    throw error ?? new Error("createUser returned no user");
  const id = data.user.id;
  created.push(id);
  if (role === "admin") {
    await db.update(profiles).set({ role: "admin" }).where(eq(profiles.id, id));
  }
  return id;
}

afterEach(async () => {
  if (!dbUp) return;
  // Demote everything this suite created so no extra admin lingers between tests.
  for (const id of created) {
    await db
      .update(profiles)
      .set({ role: "organizer" })
      .where(eq(profiles.id, id));
  }
});

afterAll(async () => {
  if (!dbUp) return;
  const admin = createAdminClient();
  for (const id of created) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  await closeDb();
});

describe.skipIf(!dbUp)("setUserRoleCore", () => {
  it("rejects changing your own role", async () => {
    const id = await makeUser("admin");
    const res = await setUserRoleCore({
      actorId: id,
      targetId: id,
      role: "organizer",
    });
    expect(res).toEqual({ error: "Nelze změnit vlastní roli." });
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(row.role).toBe("admin"); // unchanged
  });

  it("rejects demoting the last remaining admin", async () => {
    // Baseline: the seeded admin is the only admin (prior tests clean up).
    const admins = await db
      .select()
      .from(profiles)
      .where(eq(profiles.role, "admin"));
    expect(admins).toHaveLength(1);
    const soleAdmin = admins[0].id;

    const res = await setUserRoleCore({
      actorId: randomUUID(), // a different (non-self) actor
      targetId: soleAdmin,
      role: "organizer",
    });
    expect(res).toEqual({ error: "Nelze odebrat posledního administrátora." });
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, soleAdmin));
    expect(row.role).toBe("admin"); // still an admin
  });

  it("promotes an organizer to admin", async () => {
    const target = await makeUser("organizer");
    const res = await setUserRoleCore({
      actorId: randomUUID(),
      targetId: target,
      role: "admin",
    });
    expect(res).toEqual({ ok: true });
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, target));
    expect(row.role).toBe("admin");
  });

  it("demotes an admin to organizer when another admin exists", async () => {
    // Two created admins + the seeded admin → the target is not the last one.
    const target = await makeUser("admin");
    await makeUser("admin");
    const res = await setUserRoleCore({
      actorId: randomUUID(),
      targetId: target,
      role: "organizer",
    });
    expect(res).toEqual({ ok: true });
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, target));
    expect(row.role).toBe("organizer");
  });
});
