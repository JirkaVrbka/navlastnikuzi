import { describe, it, expect } from "vitest";
import type { DayWithEvents } from "@/lib/db/itinerary";
import { selectMyUpcomingAgenda } from "@/lib/domain/agenda";

const ME = "me-123";
const OTHER = "other-456";

// A fixed "now": local 2026-01-15 12:00 → todayStr "2026-01-15", nowHM "12:00".
const NOW = new Date(2026, 0, 15, 12, 0);

// Minimal event shaped like EventWithRelations (only the read fields).
function ev(opts: {
  id: string;
  date: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  organizerIds?: (string | null)[];
  delays?: number[];
  title?: string;
  location?: string | null;
}) {
  return {
    id: opts.id,
    title: opts.title ?? opts.id,
    location: opts.location ?? null,
    startsAt: `${opts.date}T${opts.start}`,
    endsAt: `${opts.date}T${opts.end}`,
    items: [],
    delays: (opts.delays ?? []).map((minutes) => ({ minutes })),
    organizers: (opts.organizerIds ?? [ME]).map((profileId) => ({ profileId })),
  };
}

// Build a DayWithEvents-shaped fixture (only id/date/label/events are read).
function day(
  id: string,
  date: string,
  events: ReturnType<typeof ev>[],
): DayWithEvents {
  return {
    id,
    date,
    label: `Den ${id}`,
    events,
  } as unknown as DayWithEvents;
}

describe("selectMyUpcomingAgenda", () => {
  it("includes only events I organize (not other-profile or free-text)", () => {
    const d = day("d1", "2026-01-20", [
      ev({ id: "mine", date: "2026-01-20", start: "10:00", end: "11:00" }),
      ev({
        id: "others",
        date: "2026-01-20",
        start: "12:00",
        end: "13:00",
        organizerIds: [OTHER],
      }),
      ev({
        id: "freetext",
        date: "2026-01-20",
        start: "14:00",
        end: "15:00",
        organizerIds: [null],
      }),
      ev({
        id: "shared",
        date: "2026-01-20",
        start: "16:00",
        end: "17:00",
        organizerIds: [OTHER, ME],
      }),
    ]);
    const groups = selectMyUpcomingAgenda([d], ME, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((e) => e.ev.id)).toEqual(["mine", "shared"]);
  });

  it("drops a whole day that is before today", () => {
    const past = day("d0", "2026-01-14", [
      ev({ id: "p", date: "2026-01-14", start: "10:00", end: "11:00" }),
    ]);
    expect(selectMyUpcomingAgenda([past], ME, NOW)).toEqual([]);
  });

  it("on today, hides an event already ended and keeps a later one", () => {
    const today = day("dT", "2026-01-15", [
      ev({ id: "done", date: "2026-01-15", start: "09:00", end: "11:00" }),
      ev({ id: "soon", date: "2026-01-15", start: "13:00", end: "14:00" }),
    ]);
    const groups = selectMyUpcomingAgenda([today], ME, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((e) => e.ev.id)).toEqual(["soon"]);
  });

  it("keeps an event on today whose displayed end equals now", () => {
    // ends exactly at 12:00 → endHM "12:00" is not < "12:00", so kept.
    const today = day("dT", "2026-01-15", [
      ev({ id: "edge", date: "2026-01-15", start: "11:00", end: "12:00" }),
    ]);
    const groups = selectMyUpcomingAgenda([today], ME, NOW);
    expect(groups[0].events.map((e) => e.ev.id)).toEqual(["edge"]);
  });

  it("keeps all my events on a future day", () => {
    const future = day("dF", "2026-02-01", [
      ev({ id: "a", date: "2026-02-01", start: "08:00", end: "09:00" }),
      ev({ id: "b", date: "2026-02-01", start: "10:00", end: "11:00" }),
    ]);
    const groups = selectMyUpcomingAgenda([future], ME, NOW);
    expect(groups[0].events.map((e) => e.ev.id)).toEqual(["a", "b"]);
  });

  it("computes timing over the full day so a non-mine delay still shifts my event", () => {
    // Earlier event (not mine) has a 30-min delay; my later event must show the
    // +30 shift — proving timings are computed over ALL events, not just mine.
    const future = day("dF", "2026-02-01", [
      ev({
        id: "early",
        date: "2026-02-01",
        start: "08:00",
        end: "09:00",
        organizerIds: [OTHER],
        delays: [30],
      }),
      ev({ id: "late", date: "2026-02-01", start: "10:00", end: "11:00" }),
    ]);
    const groups = selectMyUpcomingAgenda([future], ME, NOW);
    // Only my "late" event is kept...
    expect(groups[0].events.map((e) => e.ev.id)).toEqual(["late"]);
    // ...and its timing reflects the earlier event's 30-min delay.
    const late = groups[0].events[0];
    expect(late.timing?.shiftMinutes).toBe(30);
    expect(late.timing?.displayedStart).toBe("2026-02-01T10:30");
    expect(late.timing?.displayedEnd).toBe("2026-02-01T11:30");
  });

  it("keeps a today event whose delayed end rolls past midnight", () => {
    // Regression: a +60min delay pushes this event's displayed end from 23:45 to
    // 00:45 the NEXT day. The old HH:mm-only filter compared "00:45" < "12:00"
    // and wrongly hid it; the full-datetime compare keeps it (still ongoing).
    const today = day("dT", "2026-01-15", [
      ev({
        id: "latenight",
        date: "2026-01-15",
        start: "23:30",
        end: "23:45",
        delays: [60],
      }),
    ]);
    const groups = selectMyUpcomingAgenda([today], ME, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((e) => e.ev.id)).toEqual(["latenight"]);
    // Confirm the delay really produced a next-day displayed end.
    expect(groups[0].events[0].timing?.displayedEnd).toBe("2026-01-16T00:45");
  });

  it("returns empty when I organize nothing upcoming", () => {
    const d = day("d1", "2026-01-20", [
      ev({
        id: "x",
        date: "2026-01-20",
        start: "10:00",
        end: "11:00",
        organizerIds: [OTHER],
      }),
    ]);
    expect(selectMyUpcomingAgenda([d], ME, NOW)).toEqual([]);
  });
});
