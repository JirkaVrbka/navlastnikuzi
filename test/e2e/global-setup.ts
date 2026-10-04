import { execSync } from "node:child_process";
import postgres from "postgres";

// Before e2e: verify the separate test Supabase stack is up, then ensure its
// schema (migrations) and seeded admin are current. This keeps all test data on
// the test stack (ports 553xx) — the dev database is never touched.
const TEST_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const TEST_SUPABASE_URL = "http://127.0.0.1:55321";

export default async function globalSetup() {
  // 1. Is the test stack reachable?
  const sql = postgres(TEST_DATABASE_URL, {
    prepare: false,
    connect_timeout: 3,
  });
  try {
    await sql`select 1`;
  } catch {
    throw new Error(
      "Test Supabase stack is not reachable on 127.0.0.1:55322.\n" +
        "Start it first:  npm run supabase:test:start",
    );
  } finally {
    await sql.end({ timeout: 1 });
  }

  // 2. Ensure schema + admin on the test stack (both idempotent). The shell env
  //    overrides .env.local (dotenv does not override already-set vars).
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: TEST_SUPABASE_URL,
  };
  execSync("npm run db:migrate", { env, stdio: "ignore" });
  execSync("npm run seed:admin", { env, stdio: "ignore" });
}
