import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Data-access entrypoint. Table definitions live in ./schema.ts and are added
// per roadmap phase — no business logic is created at scaffold time.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local.");
}

// `prepare: false` is recommended when talking to Supabase's connection pooler.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
