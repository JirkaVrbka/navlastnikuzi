// Itinerary core logic — plain, session-less functions shared by the web server
// actions (app/itinerar/actions.ts) and the MCP tools (lib/mcp/tools.ts). No
// "use server", no requireUser, no revalidatePath: the web action adds the
// cookie-session gate + cache revalidation, the MCP tool adds the bearer gate.
// Validation (Zod) is done by the CALLER with the shared schemas; these take the
// already-parsed input and perform the DB work (with combineDateTime where the
// start/end times must become naive wall-clock timestamps).

import { eq, asc } from "drizzle-orm";
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

// Insert an event's items (positioned, optionally linked to a catalog prop) and
// organizers (linked user or free-text name). Shared by create + update so both
// build children identically. `checkedFor` resolves the preserved checklist
// state for the next item with a given KEY = its content/name (the stable display
// identity), consuming one match per call so duplicates restore in order; it
// defaults to always-false, i.e. brand-new items start unchecked.
async function insertEventChildren(
  tx: Tx,
  eventId: string,
  items: { propId?: string | null; name: string }[],
  organizers: { profileId?: string; name?: string }[],
  checkedFor: (key: string) => boolean = () => false,
) {
  if (items.length > 0) {
    await tx.insert(eventItems).values(
      items.map((it, position) => ({
        eventId,
        content: it.name,
        propId: it.propId ?? null,
        position,
        checked: checkedFor(it.name),
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
        color: e.color ?? null,
        block: e.block ?? null,
        type: e.type ?? null,
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
        color: e.color ?? null,
        block: e.block ?? null,
        type: e.type ?? null,
      })
      .where(eq(events.id, id))
      .returning({ id: events.id });
    if (upd.length === 0) return false;
    // Read existing items BEFORE deleting them so their checklist state survives
    // the delete+re-insert. Items are matched by KEY = content (the displayed
    // name), which is preserved across linking/unlinking a prop because the
    // submitted name is the same string either way (prop.name ?? content). So a
    // tick survives re-linking or unlinking a prop as long as the displayed name
    // is unchanged — only a RENAME drops the tick. One preserved value is consumed
    // per match (in order) so duplicate names restore correctly; a new name starts
    // unchecked.
    const existing = await tx
      .select({
        content: eventItems.content,
        checked: eventItems.checked,
      })
      .from(eventItems)
      .where(eq(eventItems.eventId, id));
    const checkedByKey = new Map<string, boolean[]>();
    for (const row of existing) {
      const arr = checkedByKey.get(row.content) ?? [];
      arr.push(row.checked);
      checkedByKey.set(row.content, arr);
    }
    const checkedFor = (key: string): boolean =>
      checkedByKey.get(key)?.shift() ?? false;

    await tx.delete(eventItems).where(eq(eventItems.eventId, id));
    await tx.delete(eventOrganizers).where(eq(eventOrganizers.eventId, id));
    await insertEventChildren(tx, id, e.items, e.organizers, checkedFor);
    return true;
  });
}

// Swap an event with its chronological neighbor within the SAME day. "up" moves
// the event before its earlier neighbor; "down" moves it after its later one.
// Both durations are preserved and the combined two-event block stays anchored at
// the earlier event's original start — only their order in time flips. Returns
// "missing" if the event is gone, "noNeighbor" if it is already the day's first
// (up) / last (down) event, "ok" otherwise. DB times are naive local wall-clock
// strings (no tz); we parse/format in local time at minute precision.
export async function reorderEventCore(
  id: string,
  direction: "up" | "down",
): Promise<"ok" | "missing" | "noNeighbor"> {
  // Parse a naive-local timestamp string to epoch ms. Handles both
  // "YYYY-MM-DD HH:mm:ss" (Postgres text) and "YYYY-MM-DDTHH:mm" (our writes).
  const ms = (s: string) => new Date(s.replace(" ", "T")).getTime();
  // Format epoch ms back to a naive-local "YYYY-MM-DDTHH:mm" using LOCAL getters.
  const fmt = (n: number): string => {
    const d = new Date(n);
    const p = (x: number) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(events).where(eq(events.id, id));
    if (!current) return "missing";

    const dayEvents = await tx
      .select({
        id: events.id,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
      })
      .from(events)
      .where(eq(events.dayId, current.dayId))
      .orderBy(asc(events.startsAt));

    const i = dayEvents.findIndex((e) => e.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= dayEvents.length) return "noNeighbor";

    const cur = dayEvents[i];
    const neighbor = dayEvents[j];
    // earlier = the one that starts first after the swap's anchor; later = behind.
    const earlier = direction === "up" ? neighbor : cur;
    const later = direction === "up" ? cur : neighbor;

    const durLater = ms(later.endsAt) - ms(later.startsAt);
    const durEarlier = ms(earlier.endsAt) - ms(earlier.startsAt);
    const base = ms(earlier.startsAt);
    const newLaterStart = base;
    const newLaterEnd = base + durLater;
    const newEarlierStart = newLaterEnd;
    const newEarlierEnd = newEarlierStart + durEarlier;

    await tx
      .update(events)
      .set({ startsAt: fmt(newLaterStart), endsAt: fmt(newLaterEnd) })
      .where(eq(events.id, later.id));
    await tx
      .update(events)
      .set({ startsAt: fmt(newEarlierStart), endsAt: fmt(newEarlierEnd) })
      .where(eq(events.id, earlier.id));
    return "ok";
  });
}

// Append one delay entry to an event (delays stack; the DB CHECK bounds minutes).
export async function addDelayCore(input: DelayInput): Promise<void> {
  await db.insert(eventDelays).values({
    eventId: input.eventId,
    minutes: input.minutes,
  });
}
