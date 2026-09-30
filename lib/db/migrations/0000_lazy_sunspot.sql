CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'organizer' NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Link profiles.id to Supabase's auth.users (drops the profile if the user is deleted).
ALTER TABLE "profiles"
	ADD CONSTRAINT "profiles_id_auth_users_fk"
	FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- Constrain role to the two allowed values.
ALTER TABLE "profiles"
	ADD CONSTRAINT "profiles_role_check" CHECK ("role" IN ('admin', 'organizer'));
--> statement-breakpoint
-- Auto-create a profile row whenever an auth user is created. Role/display name
-- are read from the user's metadata (set by the admin API); role defaults to organizer.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	INSERT INTO public.profiles (id, email, role, display_name)
	VALUES (
		NEW.id,
		NEW.email,
		COALESCE(NEW.raw_user_meta_data->>'role', 'organizer'),
		NEW.raw_user_meta_data->>'display_name'
	)
	ON CONFLICT (id) DO NOTHING;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created"
	AFTER INSERT ON "auth"."users"
	FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
--> statement-breakpoint
-- Row-Level Security: authenticated users may read profiles; writes happen only
-- via the SECURITY DEFINER trigger and the service-role admin client (which bypasses RLS).
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_select_authenticated"
	ON "public"."profiles" FOR SELECT
	TO authenticated
	USING (true);
