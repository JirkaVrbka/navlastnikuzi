import { defineConfig, devices } from "@playwright/test";

// E2E runs against a SEPARATE Supabase test stack (ports 553xx) so it never
// touches the dev database. Start it with `npm run supabase:test:start`.
// Keys are the deterministic local demo keys (identical across local stacks);
// only the ports differ.
const TEST_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const TEST_SUPABASE_URL = "http://127.0.0.1:55321";
const DEMO_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const DEMO_SECRET_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

export default defineConfig({
  testDir: "./test/e2e",
  // Ensures the test stack's schema + seeded admin are current before tests.
  globalSetup: "./test/e2e/global-setup.ts",
  // Small suite sharing one app server + one Supabase instance: run serially so
  // workers don't starve each other (which caused timing flakiness). Fast enough.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: "list",
  // Generous timeouts: the server is a single Node process backed by Supabase.
  expect: { timeout: 15_000 },
  use: {
    // Dedicated port 3100 so we NEVER reuse the dev app on 3000 (which is wired
    // to the dev DB). This, plus the test stack, keeps dev data fully isolated.
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  // Production build (dev server recompiles on first hit → transient errors),
  // pointed at the TEST stack on its own port. NEXT_PUBLIC_* are baked at build
  // time, so the env must be present for both `build` and `start`.
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: TEST_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: DEMO_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: DEMO_SECRET_KEY,
      // The built app needs MCP_TOKEN so /api/mcp can authenticate the bearer
      // used by test/e2e/mcp.spec.ts (proves middleware no longer swallows it).
      MCP_TOKEN: "test-mcp-token",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
