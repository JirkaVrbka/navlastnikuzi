import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest's built-in transform (oxc) handles TS/TSX with the automatic JSX
// runtime, so no separate React plugin is needed for unit + component tests.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
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
