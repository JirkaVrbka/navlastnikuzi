import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

// All days (ordered by date), each with its events (ordered by start time),
// and each event with its items and organizers (joined to the linked profile).
export async function getDaysWithEvents() {
  return db.query.days.findMany({
    orderBy: (d, { asc }) => [asc(d.date), asc(d.createdAt)],
    with: {
      events: {
        orderBy: (e, { asc }) => [asc(e.startsAt), asc(e.createdAt)],
        with: {
          items: {
            orderBy: (i, { asc }) => [asc(i.position), asc(i.createdAt)],
          },
          organizers: { with: { profile: true } },
        },
      },
    },
  });
}

export type DayWithEvents = Awaited<
  ReturnType<typeof getDaysWithEvents>
>[number];
export type EventWithRelations = DayWithEvents["events"][number];

// Users for the organizer picker (linked-user option).
export async function getUsersForPicker() {
  return db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
    })
    .from(profiles)
    .orderBy(asc(profiles.email));
}
export type PickableUser = Awaited<
  ReturnType<typeof getUsersForPicker>
>[number];
