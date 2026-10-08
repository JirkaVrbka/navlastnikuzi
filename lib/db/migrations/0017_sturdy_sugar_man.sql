CREATE TABLE "confession_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"confession_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"side" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "confession_placements" ADD CONSTRAINT "confession_placements_confession_id_confessions_id_fk" FOREIGN KEY ("confession_id") REFERENCES "public"."confessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confession_placements" ADD CONSTRAINT "confession_placements_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A zpověď is either open ('active') or closed read-only ('archived').
ALTER TABLE "confessions" ADD CONSTRAINT "confessions_status_check" CHECK ("status" IN ('active','archived'));--> statement-breakpoint
-- Each placement sits in column A or column B.
ALTER TABLE "confession_placements" ADD CONSTRAINT "confession_placements_side_check" CHECK ("side" IN ('a','b'));--> statement-breakpoint
-- A player appears at most once per zpověď (one placement per player).
ALTER TABLE "confession_placements" ADD CONSTRAINT "confession_placements_confession_player_unique" UNIQUE ("confession_id","player_id");--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app writes via Drizzle over the direct DB connection
-- (owner role, bypasses RLS) gated by requireUser() in the server actions.
ALTER TABLE "confessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "confession_placements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "confessions_all_authenticated" ON "confessions" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "confession_placements_all_authenticated" ON "confession_placements" FOR ALL TO authenticated USING (true) WITH CHECK (true);