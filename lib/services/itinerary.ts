// Itinerary core logic — plain, session-less functions shared by the web server
// actions (app/itinerar/actions.ts) and the MCP tools (lib/mcp/tools.ts). No
// "use server", no requireUser, no revalidatePath: the web action adds the
// cookie-session gate + cache revalidation, the MCP tool adds the bearer gate.
// Validation (Zod) is done by the CALLER with the shared schemas; these take the
// already-parsed input and perform the DB work (with combineDateTime where the
// start/end times must become naive wall-clock timestamps).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  days,
  events,
  eventItems,
  eventOrganizers,
  eventDelays,
} from "@/lib/db/schema";
import {
  combineDateTime,
  type DayInput,
  type EventFormInput,
  type DelayInput,
} from "@/lib/validation/itinerary";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Insert an event's items (positioned) and organizers (linked user or free-text
// name). Shared by create + update so both build children identically.
// `checkedFor` resolves the preserved checklist state for the next item with a
// given content (consuming one match per call so duplicate contents restore in
// order); it defaults to always-false, i.e. brand-new items start unchecked.
async function insertEventChildren(
  tx: Tx,
  eventId: string,
  items: string[],
  organizers: { profileId?: string; name?: string }[],
  checkedFor: (content: string) => boolean = () => false,
) {
  if (items.length > 0) {
    await tx.insert(eventItems).values(
      items.map((content, position) => ({
        eventId,
        content,
        position,
        checked: checkedFor(content),
      })),
    );
  }
  if (organizers.length > 0) {
    await tx.insert(eventOrganizers).values(
      organizers.map((o) => ({
        eventId,
        profileId: o.profileId ?? null,
        name: o.name ?? null,
      })),
    );
  }
}

// Insert a day; returns the new id.
export async function createDayCore(input: DayInput): Promise<string> {
  const [row] = await db.insert(days).values(input).returning({ id: days.id });
  return row.id;
}

// Create an event with its items + organizers in one transaction. Times are
// combined with the day's date into naive wall-clock timestamps. Returns the id.
export async function createEventCore(e: EventFormInput): Promise<string> {
  const { startsAt, endsAt } = combineDateTime(
    e.dayDate,
    e.startTime,
    e.endTime,
  );
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(events)
      .values({
        dayId: e.dayId,
        title: e.title,
        startsAt,
        endsAt,
        location: e.location ?? null,
        note: e.note ?? null,
        link: e.link ?? null,
      })
      .returning({ id: events.id });
    await insertEventChildren(tx, row.id, e.items, e.organizers);
    return row.id;
  });
}

// Update an event + replace its children in one transaction. Returns false if no
// event with that id exists (so the caller can report it), true otherwise.
export async function updateEventCore(
  id: string,
  e: EventFormInput,
): Promise<boolean> {
  const { startsAt, endsAt } = combineDateTime(
    e.dayDate,
    e.startTime,
    e.endTime,
  );
  return db.transaction(async (tx) => {
    const upd = await tx
      .update(events)
      .set({
        title: e.title,
        startsAt,
        endsAt,
        location: e.location ?? null,
        note: e.note ?? null,
        link: e.link ?? null,
      })
      .where(eq(events.id, id))
      .returning({ id: events.id });
    if (upd.length === 0) return false;
    // Read existing items BEFORE deleting them so their checklist state survives
    // the delete+re-insert. Items are matched by content, consuming one preserved
    // value per match (in order) so two items with the same content restore
    // correctly; a new content starts unchecked.
    const existing = await tx
      .select({ content: eventItems.content, checked: eventItems.checked })
      .from(eventItems)
      .where(eq(eventItems.eventId, id));
    const checkedByContent = new Map<string, boolean[]>();
    for (const row of existing) {
      const arr = checkedByContent.get(row.content) ?? [];
      arr.push(row.checked);
      checkedByContent.set(row.content, arr);
    }
    const checkedFor = (content: string): boolean =>
      checkedByContent.get(content)?.shift() ?? false;

    await tx.delete(eventItems).where(eq(eventItems.eventId, id));
    await tx.delete(eventOrganizers).where(eq(eventOrganizers.eventId, id));
    await insertEventChildren(tx, id, e.items, e.organizers, checkedFor);
    return true;
  });
}

// Append one delay entry to an event (delays stack; the DB CHECK bounds minutes).
export async function addDelayCore(input: DelayInput): Promise<void> {
  await db.insert(eventDelays).values({
    eventId: input.eventId,
    minutes: input.minutes,
  });
}
