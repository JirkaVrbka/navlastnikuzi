import { z } from "zod";

// A room name (free text). Czech messages, mirrors daySchema's label rule.
export const roomSchema = z.object({
  name: z.string().trim().min(1, "Zadejte název místnosti").max(100),
});
export type RoomInput = z.infer<typeof roomSchema>;

// Which boolean check a placement toggle targets.
export const placementCheckFieldSchema = z.enum(["wentToRoom", "cameBack"]);
export type PlacementCheckField = z.infer<typeof placementCheckFieldSchema>;

// One builder line: a player paired with an optional room + organizer. Shared
// by the start (snapshot) and replace (edit active) payloads below.
const assignmentsArraySchema = z.array(
  z.object({
    playerId: z.uuid(),
    roomId: z.uuid().nullable(),
    organizerProfileId: z.uuid().nullable(),
  }),
);

// Strict 1:1 refines shared by both payloads: a player may appear once, a room
// (when set) once. Reused so start and replace reject the same bad input.
type HasAssignments = { assignments: z.infer<typeof assignmentsArraySchema> };
const uniquePlayerIds = (d: HasAssignments) => {
  const ids = d.assignments.map((a) => a.playerId);
  return new Set(ids).size === ids.length;
};
const uniqueRoomIds = (d: HasAssignments) => {
  const r = d.assignments.map((a) => a.roomId).filter(Boolean);
  return new Set(r).size === r.length;
};

// The payload the drag-and-drop builder submits to start a konkláve: one entry
// per placed player (a line pairs a player with an optional room + organizer).
// Players not listed are still snapshotted (null room/organizer) server-side.
// Strict 1:1 is enforced here too — a player may appear once, a room once.
export const startKonklaveSchema = z
  .object({ assignments: assignmentsArraySchema })
  .refine(uniquePlayerIds, { message: "Hráč je ve více řádcích." })
  .refine(uniqueRoomIds, { message: "Pokoj je přiřazen víc hráčům." });
export type StartKonklaveInput = z.infer<typeof startKonklaveSchema>;

// The payload the builder submits when EDITING the active konkláve: the same
// assignment lines as start, plus which konkláve to re-arrange. The service
// updates the existing placement rows in place (same strict 1:1 refines).
export const replaceKonklaveSchema = z
  .object({
    konklaveId: z.uuid(),
    assignments: assignmentsArraySchema,
  })
  .refine(uniquePlayerIds, { message: "Hráč je ve více řádcích." })
  .refine(uniqueRoomIds, { message: "Pokoj je přiřazen víc hráčům." });
export type ReplaceKonklaveInput = z.infer<typeof replaceKonklaveSchema>;
