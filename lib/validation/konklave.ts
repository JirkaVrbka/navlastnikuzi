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

// The payload the drag-and-drop builder submits to start a konkláve: one entry
// per placed player (a line pairs a player with an optional room + organizer).
// Players not listed are still snapshotted (null room/organizer) server-side.
// Strict 1:1 is enforced here too — a player may appear once, a room once.
export const startKonklaveSchema = z
  .object({
    assignments: z.array(
      z.object({
        playerId: z.uuid(),
        roomId: z.uuid().nullable(),
        organizerProfileId: z.uuid().nullable(),
      }),
    ),
  })
  .refine(
    (d) => {
      const ids = d.assignments.map((a) => a.playerId);
      return new Set(ids).size === ids.length;
    },
    { message: "Hráč je ve více řádcích." },
  )
  .refine(
    (d) => {
      const r = d.assignments.map((a) => a.roomId).filter(Boolean);
      return new Set(r).size === r.length;
    },
    { message: "Pokoj je přiřazen víc hráčům." },
  );
export type StartKonklaveInput = z.infer<typeof startKonklaveSchema>;
