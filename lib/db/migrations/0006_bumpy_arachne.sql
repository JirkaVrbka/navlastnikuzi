CREATE TABLE "player_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"picture_path" text,
	"in_game" boolean DEFAULT true NOT NULL,
	"eliminated_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_notes" ADD CONSTRAINT "player_notes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A set reason must be one of the two allowed values (NULL while in game).
ALTER TABLE "players" ADD CONSTRAINT "players_reason_check" CHECK ("reason" IS NULL OR "reason" IN ('killed','voted_out'));--> statement-breakpoint
-- Status coherence: in game ⇒ no elimination data; out ⇒ both elimination
-- timestamp and reason present. Keeps the derived drop-out ranking well-defined.
ALTER TABLE "players" ADD CONSTRAINT "players_status_check" CHECK (
	("in_game" AND "eliminated_at" IS NULL AND "reason" IS NULL)
	OR (NOT "in_game" AND "eliminated_at" IS NOT NULL AND "reason" IS NOT NULL)
);--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app writes via Drizzle over the direct DB connection
-- (owner role, bypasses RLS) gated by requireUser() in the server actions.
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "player_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "players_all_authenticated" ON "players" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "player_notes_all_authenticated" ON "player_notes" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
-- Public Storage bucket for player photos. Created idempotently so it exists on
-- the dev + test stacks after db:migrate. Objects store a random path in
-- players.picture_path; a public bucket serves /object/public/... with no read
-- policy, and uploads go through the service-role admin client in the action.
INSERT INTO storage.buckets (id, name, public) VALUES ('player-photos', 'player-photos', true) ON CONFLICT (id) DO NOTHING;