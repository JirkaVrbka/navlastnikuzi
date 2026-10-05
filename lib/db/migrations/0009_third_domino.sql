CREATE TABLE "mcp_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "mcp_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "mcp_tokens" ADD CONSTRAINT "mcp_tokens_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- This table holds secrets (token hashes). RLS is ENABLED with NO authenticated
-- policy: no client-side (PostgREST / Realtime) access is ever allowed. The app
-- reads/writes it only via Drizzle over the direct DB connection (owner role,
-- bypasses RLS), gated by requireAdmin() in the server actions and by the MCP
-- bearer check in /api/mcp. Deny-by-default for anon and authenticated alike.
ALTER TABLE "mcp_tokens" ENABLE ROW LEVEL SECURITY;