CREATE TABLE "bank_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission" text NOT NULL,
	"profit" integer NOT NULL,
	"potential" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Mission profit is money earned; never negative.
ALTER TABLE "bank_entries" ADD CONSTRAINT "bank_entries_profit_check" CHECK ("profit" >= 0);--> statement-breakpoint
-- Potential is the unrealized ceiling and can never be below the realized profit.
ALTER TABLE "bank_entries" ADD CONSTRAINT "bank_entries_potential_check" CHECK ("potential" >= "profit");--> statement-breakpoint
-- RLS baseline for any client-side (PostgREST) access: authenticated allowed,
-- anonymous blocked. The app writes via Drizzle over the direct DB connection
-- (owner role, bypasses RLS) gated by requireUser() in the server actions.
ALTER TABLE "bank_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "bank_entries_all_authenticated" ON "bank_entries" FOR ALL TO authenticated USING (true) WITH CHECK (true);