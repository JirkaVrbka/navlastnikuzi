CREATE TABLE "konklave_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"konklave_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"room_id" uuid,
	"organizer_profile_id" uuid,
	"went_to_room" boolean DEFAULT false NOT NULL,
	"came_back" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "konklaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "konklave_placements" ADD CONSTRAINT "konklave_placements_konklave_id_konklaves_id_fk" FOREIGN KEY ("konklave_id") REFERENCES "public"."konklaves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konklave_placements" ADD CONSTRAINT "konklave_placements_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konklave_placements" ADD CONSTRAINT "konklave_placements_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konklave_placements" ADD CONSTRAINT "konklave_placements_organizer_profile_id_profiles_id_fk" FOREIGN KEY ("organizer_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- A konkláve is either open ('active') or closed read-only ('archived').
ALTER TABLE "konklaves" ADD CONSTRAINT "konklaves_status_check" CHECK ("status" IN ('active','archived'));--> statement-breakpoint
-- A player appears at most once per konkláve (one placement per player).
ALTER TABLE "konklave_placements" ADD CONSTRAINT "konklave_placements_konklave_player_unique" UNIQUE ("konklave_id","player_id");--> statement-breakpoint
-- A room is assigned to at most one player within a konkláve. Partial so the
-- many unassigned placements (room_id IS NULL) are exempt from the uniqueness.
CREATE UNIQUE INDEX "konklave_placements_konklave_room_unique" ON "konklave_placements" ("konklave_id","room_id") WHERE "room_id" IS NOT NULL;--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app writes via Drizzle over the direct DB connection
-- (owner role, bypasses RLS) gated by requireUser() in the server actions.
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "konklaves" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "konklave_placements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rooms_all_authenticated" ON "rooms" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "konklaves_all_authenticated" ON "konklaves" FOR ALL TO authenticated USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "konklave_placements_all_authenticated" ON "konklave_placements" FOR ALL TO authenticated USING (true) WITH CHECK (true);