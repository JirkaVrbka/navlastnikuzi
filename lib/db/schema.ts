import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// Drizzle schema — Postgres table definitions.
// The FK to Supabase's auth.users, the role CHECK, the signup trigger, and RLS
// are applied via raw SQL appended to this table's migration (drizzle can't
// express triggers/RLS/cross-schema FKs). See lib/db/migrations/.

export const profiles = pgTable("profiles", {
  // Same id as the auth.users row (FK added in the migration).
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  // 'admin' | 'organizer' — CHECK constraint added in the migration.
  role: text("role").notNull().default("organizer"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
