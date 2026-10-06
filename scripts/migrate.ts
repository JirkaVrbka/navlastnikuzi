import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Applies pending Drizzle migrations with its OWN short-lived connection (does
// NOT import lib/db, which hardcodes the Supabase pooler). At Vercel build time
// set MIGRATE_DATABASE_URL to a direct (non-pooler) connection string; it falls
// back to DATABASE_URL. Run with: npm run migrate:prod
async function main() {
  const url = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set MIGRATE_DATABASE_URL or DATABASE_URL before running migrations.",
    );
  }

  console.log("Running migrations…");
  const sql = postgres(url, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: "lib/db/migrations" });
  await sql.end();
  console.log("migrations applied");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
