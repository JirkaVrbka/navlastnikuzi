ALTER TABLE "event_organizers" DROP CONSTRAINT "event_organizers_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;