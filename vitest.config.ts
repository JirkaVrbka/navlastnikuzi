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
      // Service-role admin client target for integration tests that create login
      // accounts (create_organizer). Same deterministic local demo keys as the
      // e2e stack (see playwright.config.ts) — only the ports differ (553xx).
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
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
      // `server-only` is a Next.js-provided marker that does not resolve under
      // Vitest; stub it so server modules (admin client, user service) can load.
      "server-only": fileURLToPath(
        new URL("./test/helpers/server-only.ts", import.meta.url),
      ),
    },
  },
});
