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
import { createProp, deleteProp } from "@/lib/db/props";
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
      items: [{ name: a }, { name: b }],
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

  it("preserves checked across linking a free-text item (keyed by propId ?? content)", async () => {
    const propName = `Rekvizita ${randomUUID()}`;
    const propId = await createProp({
      name: propName,
      count: 1,
      haveIt: true,
    });
    const dayId = await createDayCore({
      date: "2030-07-02",
      label: `Link den ${randomUUID()}`,
    });
    // Start as free text with the SAME display name as the prop.
    const form = {
      dayId,
      dayDate: "2030-07-02",
      title: "Původní",
      startTime: "08:00",
      endTime: "09:00",
      items: [{ name: propName }],
      organizers: [],
    };
    const eventId = await createEventCore(form);

    // Tick the free-text item.
    const [before] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(before.propId).toBeNull();
    await setEventItemChecked(db, before.id, true);

    // Now link it to the catalog prop (propId set) — content name unchanged.
    await updateEventCore(eventId, {
      ...form,
      items: [{ name: propName, propId }],
    });

    // The key CHANGED from content → propId, so a newly-linked item does NOT
    // inherit the old free-text checked state: it starts unchecked.
    const [afterLink] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(afterLink.propId).toBe(propId);
    expect(afterLink.checked).toBe(false);

    // Tick the linked item, then edit again (still linked) → checked survives
    // because it is keyed on the stable propId.
    await setEventItemChecked(db, afterLink.id, true);
    await updateEventCore(eventId, {
      ...form,
      title: "Znovu",
      items: [{ name: propName, propId }],
    });
    const [afterReedit] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(afterReedit.checked).toBe(true);

    await deleteProp(propId);
  });

  it("preserves checked when a linked prop is later unlinked (both keyed by propId)", async () => {
    const propName = `Rekvizita ${randomUUID()}`;
    const propId = await createProp({
      name: propName,
      count: 1,
      haveIt: false,
    });
    const dayId = await createDayCore({
      date: "2030-07-03",
      label: `Unlink den ${randomUUID()}`,
    });
    const base = {
      dayId,
      dayDate: "2030-07-03",
      title: "Původní",
      startTime: "08:00",
      endTime: "09:00",
      organizers: [],
    };
    const eventId = await createEventCore({
      ...base,
      items: [{ name: propName, propId }],
    });

    const [linked] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(linked.propId).toBe(propId);
    await setEventItemChecked(db, linked.id, true);

    // Re-edit while STILL linked → checked preserved (key = propId).
    await updateEventCore(eventId, {
      ...base,
      title: "Stále napojeno",
      items: [{ name: propName, propId }],
    });
    const [stillLinked] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(stillLinked.checked).toBe(true);

    // Now unlink (drop propId, keep the same name) → key changes propId → content,
    // so the unlinked item starts fresh (unchecked).
    await updateEventCore(eventId, {
      ...base,
      items: [{ name: propName }],
    });
    const [unlinked] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId));
    expect(unlinked.propId).toBeNull();
    expect(unlinked.checked).toBe(false);

    await deleteProp(propId);
  });
});
