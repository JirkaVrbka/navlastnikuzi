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
  // Optional per-event accent color (hex "#rrggbb"); recolors the itinerary
  // spine. Null = use the default gold/oxblood bar.
  color: text("color"),
  // Optional free-text block/grouping label (e.g. a programme block the event
  // belongs to); suggested from blocks already used on other events. Null = none.
  block: text("block"),
  // Optional free-text event type/kind. Null = fall back to the event's title at
  // display time (stored verbatim; the UI/consumers default to the title).
  type: text("type"),
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
  // Persisted checklist state: the organizer ticks off props they physically
  // have. Survives reloads and event edits (reconciled by content in
  // updateEventCore); never auto-resets.
  checked: boolean("checked").notNull().default(false),
  // Optional link to a catalog prop (Rekvizity). SET NULL on prop delete so a
  // removed catalog entry never blocks keeping the item — it just becomes an
  // un-catalogued free-text item again. Null = free-text only (not catalogued).
  propId: uuid("prop_id").references(() => props.id, { onDelete: "set null" }),
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

// ── Rekvizity (props catalog) ───────────────────────────────────────────────
// The master list of real-world props the group tracks: how many they own
// (`count`), whether they physically have it (`have_it`), and a free-text note.
// `name` is unique so the catalog has one canonical entry per prop. Event items
// link here via event_items.prop_id (SET NULL on delete); the count/status are
// catalog-level only (not per event).
export const props = pgTable("props", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  count: integer("count").notNull().default(0),
  haveIt: boolean("have_it").notNull().default(false),
  note: text("note"),
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

// ── Konkláve (rooms + placements) ──────────────────────────────────────────
// A free-text room (e.g. "pokoj 432", "půda"). Rooms are reusable across
// konkláves; a room is assigned to at most one player within a single konkláve
// (a partial unique index in the migration enforces that).
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A konkláve instance (voting-like). `status` is 'active' while open and
// 'archived' once finished; a CHECK in the migration enforces the allowed
// values. One-active-at-a-time is enforced in the service, like votings.
export const konklaves = pgTable("konklaves", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// One placement (umístění) per snapshotted in-game player inside a konkláve.
// Room SET NULL so deleting a room never blocks keeping the konkláve; organizer
// SET NULL likewise. A unique (konklave_id, player_id) + a partial unique
// (konklave_id, room_id) WHERE room_id IS NOT NULL are added in the migration.
export const konklavePlacements = pgTable("konklave_placements", {
  id: uuid("id").primaryKey().defaultRandom(),
  konklaveId: uuid("konklave_id")
    .notNull()
    .references(() => konklaves.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  organizerProfileId: uuid("organizer_profile_id").references(
    () => profiles.id,
    { onDelete: "set null" },
  ),
  wentToRoom: boolean("went_to_room").notNull().default(false),
  cameBack: boolean("came_back").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Zpověď (two-column split of players) ────────────────────────────────────
// A zpověď instance (konkláve-like). `status` is 'active' while open and
// 'archived' once finished; a CHECK in the migration enforces the allowed
// values. One-active-at-a-time is enforced in the service, like konkláves.
export const confessions = pgTable("confessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// One placement per snapshotted in-game player inside a zpověď. Instead of a
// room, each sits in column A or B (`side`). `done` = "Hotovo" (already
// confessed); `note` is a free-text note scoped to this zpověď only (NOT the
// global player_notes). A CHECK (side IN ('a','b')) + a unique
// (confession_id, player_id) are added in the migration.
export const confessionPlacements = pgTable("confession_placements", {
  id: uuid("id").primaryKey().defaultRandom(),
  confessionId: uuid("confession_id")
    .notNull()
    .references(() => confessions.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  side: text("side").notNull(),
  done: boolean("done").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Banka (global mission bank) ─────────────────────────────────────────────
// One global bank of mission earnings (no per-event/day). Amounts are integer
// Czech koruny (Kč); `profit` may be negative (a mission can lose money).
// `potential` is the unrealized ceiling for the mission — the service sets it
// equal to `profit` when the organizer omits it. CHECK ("potential" >= "profit")
// is added in the migration (drizzle can't express it); the old non-negative
// floor on profit was dropped in migration 0020.
export const bankEntries = pgTable("bank_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  mission: text("mission").notNull(),
  profit: integer("profit").notNull(),
  potential: integer("potential").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── MCP tokens (phase 8) ───────────────────────────────────────────────────
// Admin-generated bearer tokens gating the remote MCP endpoint (/api/mcp).
// Only the SHA-256 hash of the token is stored (API-key pattern) — the plaintext
// is shown once at creation and never persisted. RLS is enabled with NO policy
// (holds secrets; only ever touched server-side over the owner connection, gated
// by requireAdmin / the MCP bearer check). See the 0009 migration.
export const mcpTokens = pgTable("mcp_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  // SHA-256 hex digest of the plaintext token; unique so a lookup by hash hits
  // at most one row.
  tokenHash: text("token_hash").notNull().unique(),
  // SET NULL so deleting the creating admin never blocks keeping the token.
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// ── Stůl (table seating) ────────────────────────────────────────────────────
// One permanent rectangular seating map (no history). Exactly 20 rows, seeded in
// the migration: seat_number 1..20 (generated clockwise from the top-left; never
// edited), each holding at most one player. A player sits in at most one seat —
// a partial unique index on player_id (in the migration) enforces that while the
// many empty seats (player_id NULL) stay exempt. ON DELETE SET NULL so removing a
// player just empties their seat; the 20 rows persist forever.
export const tableSeats = pgTable("table_seats", {
  id: uuid("id").primaryKey().defaultRandom(),
  seatNumber: integer("seat_number").notNull().unique(),
  playerId: uuid("player_id").references(() => players.id, {
    onDelete: "set null",
  }),
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
  prop: one(props, {
    fields: [eventItems.propId],
    references: [props.id],
  }),
}));

export const propsRelations = relations(props, ({ many }) => ({
  items: many(eventItems),
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

export const konklavesRelations = relations(konklaves, ({ many }) => ({
  placements: many(konklavePlacements),
}));

export const konklavePlacementsRelations = relations(
  konklavePlacements,
  ({ one }) => ({
    konklave: one(konklaves, {
      fields: [konklavePlacements.konklaveId],
      references: [konklaves.id],
    }),
    player: one(players, {
      fields: [konklavePlacements.playerId],
      references: [players.id],
    }),
    room: one(rooms, {
      fields: [konklavePlacements.roomId],
      references: [rooms.id],
    }),
    organizer: one(profiles, {
      fields: [konklavePlacements.organizerProfileId],
      references: [profiles.id],
    }),
  }),
);

export const confessionsRelations = relations(confessions, ({ many }) => ({
  placements: many(confessionPlacements),
}));

export const confessionPlacementsRelations = relations(
  confessionPlacements,
  ({ one }) => ({
    confession: one(confessions, {
      fields: [confessionPlacements.confessionId],
      references: [confessions.id],
    }),
    player: one(players, {
      fields: [confessionPlacements.playerId],
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
export type Prop = typeof props.$inferSelect;
export type Voting = typeof votings.$inferSelect;
export type VotingCandidate = typeof votingCandidates.$inferSelect;
export type McpToken = typeof mcpTokens.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Konklave = typeof konklaves.$inferSelect;
export type KonklavePlacement = typeof konklavePlacements.$inferSelect;
export type Confession = typeof confessions.$inferSelect;
export type ConfessionPlacement = typeof confessionPlacements.$inferSelect;
export type BankEntry = typeof bankEntries.$inferSelect;
