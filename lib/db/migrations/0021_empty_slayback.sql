CREATE TABLE "table_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seat_number" integer NOT NULL,
	"player_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "table_seats_seat_number_unique" UNIQUE("seat_number")
);
--> statement-breakpoint
ALTER TABLE "table_seats" ADD CONSTRAINT "table_seats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- A player sits in at most one seat. Partial so the many empty seats
-- (player_id IS NULL) are exempt from the uniqueness.
CREATE UNIQUE INDEX "table_seats_player_unique" ON "table_seats" ("player_id") WHERE "player_id" IS NOT NULL;--> statement-breakpoint
-- Seed the 20 permanent seats (numbers generated clockwise from the top-left by
-- lib/domain/table.ts; the DB stores only the number + the seated player).
INSERT INTO "table_seats" ("seat_number") SELECT generate_series(1, 20) ON CONFLICT ("seat_number") DO NOTHING;--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app writes via Drizzle over the direct DB connection
-- (owner role, bypasses RLS) gated by requireUser()/isAdmin() in the actions.
ALTER TABLE "table_seats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "table_seats_all_authenticated" ON "table_seats" FOR ALL TO authenticated USING (true) WITH CHECK (true);