import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import postgres from "postgres";

// The e2e MCP test authenticates with this known plaintext token; the DB stores
// only its SHA-256 hash (same as lib/mcp/tokens.ts hashToken). Inlined here to
// keep global-setup free of app-alias imports.
const E2E_MCP_TOKEN = "test-mcp-token";
const E2E_MCP_TOKEN_HASH = createHash("sha256")
  .update(E2E_MCP_TOKEN)
  .digest("hex");

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

  // 3. Seed a known, non-revoked MCP token (idempotent) so the MCP e2e test can
  //    send `Authorization: Bearer test-mcp-token`. Only its hash is stored.
  const tokenSql = postgres(TEST_DATABASE_URL, {
    prepare: false,
    connect_timeout: 3,
  });
  try {
    await tokenSql`
      insert into mcp_tokens (label, token_hash)
      select ${"e2e test token"}, ${E2E_MCP_TOKEN_HASH}
      where not exists (
        select 1 from mcp_tokens where token_hash = ${E2E_MCP_TOKEN_HASH}
      )
    `;
  } finally {
    await tokenSql.end({ timeout: 1 });
  }
}
