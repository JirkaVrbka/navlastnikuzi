CREATE TABLE "voting_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"eliminated_player_id" uuid
);
--> statement-breakpoint
ALTER TABLE "voting_candidates" ADD CONSTRAINT "voting_candidates_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_candidates" ADD CONSTRAINT "voting_candidates_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "votings_eliminated_player_id_players_id_fk" FOREIGN KEY ("eliminated_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- A voting is either open ('active') or closed read-only ('archived').
ALTER TABLE "votings" ADD CONSTRAINT "votings_status_check" CHECK ("status" IN ('active','archived'));--> statement-breakpoint
-- A vote count is never negative (enforced alongside the atomic GREATEST(0, …) update).
ALTER TABLE "voting_candidates" ADD CONSTRAINT "voting_candidates_votes_check" CHECK ("votes" >= 0);--> statement-breakpoint
-- A player appears at most once per voting (one candidate row per voting).
ALTER TABLE "voting_candidates" ADD CONSTRAINT "voting_candidates_voting_player_unique" UNIQUE ("voting_id","player_id");--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST / Realtime) access: authenticated
-- allowed, anonymous blocked. The app writes via Drizzle over the direct DB
-- connection (owner role, bypasses RLS) gated by requireUser() in the server
-- actions; the browser only SUBSCRIBES to voting_candidates for live tallies.
ALTER TABLE "votings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voting_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "votings_all_authenticated" ON "votings" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "voting_candidates_all_authenticated" ON "voting_candidates" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
-- Realtime: broadcast changes to voting_candidates so every organizer's tally
-- updates live. `replica identity full` makes UPDATE payloads carry the whole
-- new row (so payload.new.votes is present). Idempotent add (safe to re-run).
ALTER TABLE "voting_candidates" REPLICA IDENTITY FULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER PUBLICATION supabase_realtime ADD TABLE "voting_candidates";
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;