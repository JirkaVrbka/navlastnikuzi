import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Drizzle schema — Postgres table definitions.
// Cross-schema FK to auth.users, CHECK constraints, the signup trigger, and RLS
// are applied via raw SQL in the migrations (drizzle can't express those). See
// lib/db/migrations/.

// ── Auth / users (phase 2) ────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("organizer"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Itinerary (phase 3) ───────────────────────────────────────────────────
export const days = pgTable("days", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayId: uuid("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Naive local wall-clock timestamps (no time zone). CHECK ends_at >= starts_at
  // is added in the migration. mode:"string" avoids any tz conversion.
  startsAt: timestamp("starts_at", { mode: "string" }).notNull(),
  endsAt: timestamp("ends_at", { mode: "string" }).notNull(),
  location: text("location"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventItems = pgTable("event_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventOrganizers = pgTable("event_organizers", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  // Either a linked user (profile_id) OR a free-text name. CHECK that at least
  // one is set is added in the migration. Cascade on user delete: dropping the
  // user removes the assignment (SET NULL would leave both columns null and
  // violate the CHECK, blocking the user's deletion).
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations (for db.query relational reads) ─────────────────────────────
export const daysRelations = relations(days, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  day: one(days, { fields: [events.dayId], references: [days.id] }),
  items: many(eventItems),
  organizers: many(eventOrganizers),
}));

export const eventItemsRelations = relations(eventItems, ({ one }) => ({
  event: one(events, { fields: [eventItems.eventId], references: [events.id] }),
}));

export const eventOrganizersRelations = relations(
  eventOrganizers,
  ({ one }) => ({
    event: one(events, {
      fields: [eventOrganizers.eventId],
      references: [events.id],
    }),
    profile: one(profiles, {
      fields: [eventOrganizers.profileId],
      references: [profiles.id],
    }),
  }),
);

export type Profile = typeof profiles.$inferSelect;
export type Day = typeof days.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventItem = typeof eventItems.$inferSelect;
export type EventOrganizer = typeof eventOrganizers.$inferSelect;
