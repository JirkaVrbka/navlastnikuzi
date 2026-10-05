import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, closeDb } from "@/lib/db";
import { eventItems } from "@/lib/db/schema";
import {
  createDayCore,
  createEventCore,
  updateEventCore,
} from "@/lib/services/itinerary";
import { setEventItemChecked } from "@/lib/db/itinerary";
import { isDbUp } from "./helpers/db";

// DB-backed (shared TEST stack, never reset): every assertion targets rows this
// test created (unique contents), never table counts.
const dbUp = await isDbUp();

afterAll(async () => {
  if (dbUp) await closeDb();
});

describe.skipIf(!dbUp)("updateEventCore preserves checked state", () => {
  it("keeps a ticked item ticked (matched by content) across an edit", async () => {
    const dayId = await createDayCore({
      date: "2030-07-01",
      label: `Items den ${randomUUID()}`,
    });
    const a = `Áčko ${randomUUID()}`;
    const b = `Béčko ${randomUUID()}`;
    const form = {
      dayId,
      dayDate: "2030-07-01",
      title: "Původní",
      startTime: "08:00",
      endTime: "09:00",
      items: [a, b],
      organizers: [],
    };
    const eventId = await createEventCore(form);

    // Tick "B".
    const itemsBefore = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    const itemB = itemsBefore.find((r) => r.content === b)!;
    const n = await setEventItemChecked(db, itemB.id, true);
    expect(n).toBe(1);

    // Edit only the title; the items are the same strings.
    const existed = await updateEventCore(eventId, {
      ...form,
      title: "Upravený",
    });
    expect(existed).toBe(true);

    // "B" is still checked, "A" is not — reconciled by content on re-insert.
    const itemsAfter = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(itemsAfter.find((r) => r.content === b)?.checked).toBe(true);
    expect(itemsAfter.find((r) => r.content === a)?.checked).toBe(false);
  });
});
