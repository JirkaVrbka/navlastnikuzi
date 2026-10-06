import { config } from "dotenv";
config({ path: ".env.local" });

import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

// Creates the first admin from env credentials, and always ensures its role is
// 'admin' (the signup trigger creates every profile as 'organizer'; privilege is
// set only here / via the admin UI). Idempotent. Run with: npm run seed:admin
export async function seedAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  if (!email || !password) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local first.",
    );
  }

  // Service-role client bypasses RLS.
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Promote a profile row to admin.
  async function makeAdmin(id: string) {
    const { error } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", id);
    if (error) throw error;
  }

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw listErr;

  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    await makeAdmin(existing.id);
    console.log(
      `Admin already exists: ${email} (id ${existing.id}); role ensured = admin.`,
    );
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Admin" },
  });
  if (error) throw error;

  const id = data.user!.id;
  await makeAdmin(id);
  console.log(`Created admin ${email} (id ${id}).`);
}

// Self-run only when executed directly (so `npm run seed:admin` still works),
// not when imported by scripts/seed.ts.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
