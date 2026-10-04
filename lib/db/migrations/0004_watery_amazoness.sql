CREATE TABLE "event_delays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_delays" ADD CONSTRAINT "event_delays_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A delay is a positive number of minutes, bounded to a sane range.
ALTER TABLE "event_delays" ADD CONSTRAINT "event_delays_minutes_check" CHECK ("minutes" > 0 AND "minutes" <= 600);--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app itself writes via Drizzle over the direct DB
-- connection (owner role, bypasses RLS) and is gated by requireUser() in the
-- server actions — that is the enforcing check for this code path.
ALTER TABLE "event_delays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "event_delays_all_authenticated" ON "event_delays" FOR ALL TO authenticated USING (true) WITH CHECK (true);