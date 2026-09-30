-- Harden signup: NEVER trust client-supplied role. Every profile is created as
-- 'organizer'; admin privilege is granted only by the service-role path (admin UI
-- or seed) after creation. This is defense-in-depth on top of disabling signup.
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
		'organizer',
		NEW.raw_user_meta_data->>'display_name'
	)
	ON CONFLICT (id) DO NOTHING;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Tighten RLS: via the client, a user may read only their OWN profile. The app
-- reads profiles server-side over the direct DB connection (which bypasses RLS),
-- so features are unaffected; this only limits client-side enumeration.
DROP POLICY IF EXISTS "profiles_select_authenticated" ON "public"."profiles";
--> statement-breakpoint
CREATE POLICY "profiles_select_own"
	ON "public"."profiles" FOR SELECT
	TO authenticated
	USING ((select auth.uid()) = id);
