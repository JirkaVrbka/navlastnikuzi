-- Realtime: broadcast changes to konklave_placements so every organizer's view
-- (the konkláve page and the home "Moje konkláve" section) updates live when a
-- check (went_to_room / came_back) toggles elsewhere. `replica identity full`
-- makes UPDATE payloads carry the whole new row (so payload.new.went_to_room /
-- .came_back are present). Idempotent add (safe to re-run). No schema change.
ALTER TABLE "konklave_placements" REPLICA IDENTITY FULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER PUBLICATION supabase_realtime ADD TABLE "konklave_placements";
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
