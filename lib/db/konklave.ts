import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";

// Placement joins shared by the active + archived reads: each placement carries
// its player, its room, and the assigned organizer profile (any may be null).
const placementWith = {
  player: {
    columns: {
      id: true,
      name: true,
      nickname: true,
      picturePath: true,
      inGame: true,
    },
  },
  room: { columns: { id: true, name: true } },
  organizer: { columns: { id: true, email: true, displayName: true } },
} as const;

// All rooms, oldest first then by name — the stable list for the Místnosti
// section and the placement room <select>.
export async function getRooms() {
  return db.query.rooms.findMany({
    orderBy: () => [asc(rooms.createdAt), asc(rooms.name)],
  });
}

// The single active konkláve with its placements (+ joined player/room/
// organizer), or null if none is open. Only one is expected active at a time.
export async function getActiveKonklave() {
  const konklave = await db.query.konklaves.findFirst({
    where: (k, { eq }) => eq(k.status, "active"),
    orderBy: (k, { desc }) => [desc(k.createdAt)],
    with: {
      placements: {
        orderBy: (p, { asc }) => [asc(p.createdAt), asc(p.id)],
        with: placementWith,
      },
    },
  });
  return konklave ?? null;
}

// Archived konkláves, newest finished first, with the same placement joins for
// the read-only history list.
export async function getArchivedKonklaves() {
  return db.query.konklaves.findMany({
    where: (k, { eq }) => eq(k.status, "archived"),
    orderBy: (k, { desc }) => [desc(k.finishedAt), desc(k.createdAt)],
    with: {
      placements: {
        orderBy: (p, { asc }) => [asc(p.createdAt), asc(p.id)],
        with: placementWith,
      },
    },
  });
}

// Inferred row types for the client UI (Phase B).
export type RoomRow = Awaited<ReturnType<typeof getRooms>>[number];
export type ActiveKonklave = NonNullable<
  Awaited<ReturnType<typeof getActiveKonklave>>
>;
export type ArchivedKonklave = Awaited<
  ReturnType<typeof getArchivedKonklaves>
>[number];
export type PlacementRow = ActiveKonklave["placements"][number];
