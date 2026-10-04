import postgres from "postgres";

// Connectivity probe for the Supabase TEST stack (DATABASE_URL is forced to the
// test stack in vitest.config.ts). DB-backed suites use `describe.skipIf(!dbUp)`
// so `npm test` stays green when the stack is down (start it with
// `npm run supabase:test:start`).
export async function isDbUp(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  const sql = postgres(url, { prepare: false, connect_timeout: 3, max: 1 });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
