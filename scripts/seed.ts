import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db, closeDb } from "../lib/db";
import { profiles } from "../lib/db/schema";
import { seedAdmin } from "./seed-admin";

// Seed gate: only seeds when the DB has no admin yet, so re-running at every
// build is safe (and seedAdmin itself is idempotent). Run with: npm run seed
async function main() {
  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.role, "admin"))
    .limit(1);

  if (existing.length > 0) {
    console.log("admin exists, skipping seed");
  } else {
    console.log("empty DB, seeding");
    await seedAdmin();
  }

  await closeDb();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
