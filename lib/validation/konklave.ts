import { z } from "zod";

// A room name (free text). Czech messages, mirrors daySchema's label rule.
export const roomSchema = z.object({
  name: z.string().trim().min(1, "Zadejte název místnosti").max(100),
});
export type RoomInput = z.infer<typeof roomSchema>;

// A partial patch for a placement: change the room and/or the assigned
// organizer. Each field is optional so the action applies only what's provided;
// null clears the assignment (— bez místnosti — / no organizer).
export const placementPatchSchema = z.object({
  roomId: z.uuid().nullable().optional(),
  organizerProfileId: z.uuid().nullable().optional(),
});
export type PlacementPatch = z.infer<typeof placementPatchSchema>;

// Which boolean check a placement toggle targets.
export const placementCheckFieldSchema = z.enum(["wentToRoom", "cameBack"]);
export type PlacementCheckField = z.infer<typeof placementCheckFieldSchema>;
