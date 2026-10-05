import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, events, eventItems } from "@/lib/db/schema";

// A db-or-transaction executor, so a helper can run standalone or be enlisted in
// a caller's transaction (mirrors the pattern in lib/db/players.ts).
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

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
          delays: { orderBy: (d, { asc }) => [asc(d.createdAt)] },
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

// Set a single event item's checklist state (ticked/unticked). Runs against
// `db` or a caller's transaction (executor). Returns the number of rows updated
// (0 = the item no longer exists). Mirrors eliminatePlayerById in lib/db/players.ts.
export async function setEventItemChecked(
  executor: Executor,
  itemId: string,
  checked: boolean,
): Promise<number> {
  const updated = await executor
    .update(eventItems)
    .set({ checked })
    .where(eq(eventItems.id, itemId))
    .returning({ id: eventItems.id });
  return updated.length;
}

export type EventItemFilter = "checked" | "unchecked" | "all";

// Flat list of event items for the checklist (joined to the parent event's title
// for context), ordered by event then item position. `filter` narrows to only
// ticked / only unticked items; `eventId` narrows to a single event.
export async function getEventItems(filter: EventItemFilter, eventId?: string) {
  const conditions = [];
  if (filter === "checked") conditions.push(eq(eventItems.checked, true));
  if (filter === "unchecked") conditions.push(eq(eventItems.checked, false));
  if (eventId) conditions.push(eq(eventItems.eventId, eventId));
  return db
    .select({
      id: eventItems.id,
      eventId: eventItems.eventId,
      eventTitle: events.title,
      content: eventItems.content,
      checked: eventItems.checked,
      position: eventItems.position,
    })
    .from(eventItems)
    .innerJoin(events, eq(eventItems.eventId, events.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(eventItems.eventId), asc(eventItems.position));
}
export type EventItemRow = Awaited<ReturnType<typeof getEventItems>>[number];
