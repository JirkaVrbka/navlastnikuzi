import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load env from .env.local for drizzle-kit CLI commands (generate/migrate/push).
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
