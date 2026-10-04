import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  boolean,
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
  // Optional external-document link for the whole event.
  link: text("link"),
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

// Append-only delay entries. Each row is one delay applied to an event; they
// stack. CHECK (minutes 1..600) is added in the migration.
export const eventDelays = pgTable("event_delays", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  minutes: integer("minutes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Players (phase 5) ──────────────────────────────────────────────────────
// A player in the game. Drop-out ORDER is not stored — it is derived by ranking
// `eliminated_at` (see lib/domain/players.ts). Status coherence + the allowed
// `reason` values are enforced by CHECK constraints added in the migration.
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  // Storage object path inside the public `player-photos` bucket (e.g.
  // "<uuid>.jpg") — NOT a full URL, so it stays portable across environments.
  // The display URL is built at render time by publicPhotoUrl() (lib/photos.ts).
  picturePath: text("picture_path"),
  inGame: boolean("in_game").notNull().default(true),
  eliminatedAt: timestamp("eliminated_at", { withTimezone: true }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Separate, append-only notes for a player (each its own removable row).
export const playerNotes = pgTable("player_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Voting (phase 6) ───────────────────────────────────────────────────────
// A voting round. `status` is 'active' while open and 'archived' once ended.
// `eliminated_player_id` records who was voted out when it ended (NULL = nobody).
// A CHECK in the migration enforces only the allowed status values
// (status IN ('active','archived')); the on-end invariants (archived ⇒ ended_at
// set, a valid eliminee, etc.) are enforced in the endVoting action's
// transaction, not by the DB. Realtime is enabled on voting_candidates (not here).
export const votings = pgTable("votings", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  // SET NULL so deleting a player never blocks keeping the voting's history.
  eliminatedPlayerId: uuid("eliminated_player_id").references(
    () => players.id,
    { onDelete: "set null" },
  ),
});

// One candidate (a snapshot of an in-game player) inside a voting, with its live
// vote count. `votes >= 0` + a unique (voting_id, player_id) are added in the
// migration. Realtime UPDATE payloads come from this table (replica identity full).
export const votingCandidates = pgTable("voting_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  votingId: uuid("voting_id")
    .notNull()
    .references(() => votings.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  votes: integer("votes").notNull().default(0),
});

// ── Relations (for db.query relational reads) ─────────────────────────────
export const daysRelations = relations(days, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  day: one(days, { fields: [events.dayId], references: [days.id] }),
  items: many(eventItems),
  organizers: many(eventOrganizers),
  delays: many(eventDelays),
}));

export const eventDelaysRelations = relations(eventDelays, ({ one }) => ({
  event: one(events, {
    fields: [eventDelays.eventId],
    references: [events.id],
  }),
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

export const playersRelations = relations(players, ({ many }) => ({
  notes: many(playerNotes),
}));

export const playerNotesRelations = relations(playerNotes, ({ one }) => ({
  player: one(players, {
    fields: [playerNotes.playerId],
    references: [players.id],
  }),
}));

export const votingsRelations = relations(votings, ({ one, many }) => ({
  candidates: many(votingCandidates),
  eliminatedPlayer: one(players, {
    fields: [votings.eliminatedPlayerId],
    references: [players.id],
  }),
}));

export const votingCandidatesRelations = relations(
  votingCandidates,
  ({ one }) => ({
    voting: one(votings, {
      fields: [votingCandidates.votingId],
      references: [votings.id],
    }),
    player: one(players, {
      fields: [votingCandidates.playerId],
      references: [players.id],
    }),
  }),
);

export type Profile = typeof profiles.$inferSelect;
export type Day = typeof days.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventItem = typeof eventItems.$inferSelect;
export type EventOrganizer = typeof eventOrganizers.$inferSelect;
export type EventDelay = typeof eventDelays.$inferSelect;
export type Player = typeof players.$inferSelect;
export type PlayerNote = typeof playerNotes.$inferSelect;
export type Voting = typeof votings.$inferSelect;
export type VotingCandidate = typeof votingCandidates.$inferSelect;
