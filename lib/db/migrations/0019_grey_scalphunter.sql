CREATE TABLE "props" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"have_it" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "props_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "event_items" ADD COLUMN "prop_id" uuid;--> statement-breakpoint
ALTER TABLE "event_items" ADD CONSTRAINT "event_items_prop_id_props_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."props"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app writes via Drizzle over the direct DB connection
-- (owner role, bypasses RLS) gated by requireUser() in the server actions / MCP.
ALTER TABLE "props" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "props_all_authenticated" ON "props" FOR ALL TO authenticated USING (true) WITH CHECK (true);