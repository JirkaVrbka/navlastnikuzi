import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest's built-in transform (oxc) handles TS/TSX with the automatic JSX
// runtime, so no separate React plugin is needed for unit + component tests.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    // DB-backed integration tests (MCP tools + endpoint) run ONLY against the
    // separate Supabase TEST stack (ports 553xx) — never the dev stack. Start it
    // with `npm run supabase:test:start`. Suites skip themselves if it is down.
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      MCP_TOKEN: "test-mcp-token",
    },
    include: [
      "test/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["test/e2e/**", "node_modules/**", ".next/**"],
    // Early phases may have no unit tests yet; don't fail the suite for that.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
