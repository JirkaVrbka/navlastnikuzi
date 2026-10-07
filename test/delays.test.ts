import { describe, it, expect } from "vitest";
import { addMinutes, computeDisplayedTimings } from "@/lib/domain/delays";

describe("addMinutes", () => {
  it("adds within the hour", () =>
    expect(addMinutes("2024-10-12T08:00", 15)).toBe("2024-10-12T08:15"));
  it("rolls into the next hour", () =>
    expect(addMinutes("2024-10-12T08:50", 20)).toBe("2024-10-12T09:10"));
  it("crosses midnight", () =>
    expect(addMinutes("2024-10-12T23:50", 20)).toBe("2024-10-13T00:10"));
  it("accepts the Postgres space format", () =>
    expect(addMinutes("2024-10-12 23:00:00", 60)).toBe("2024-10-13T00:00"));
});

describe("computeDisplayedTimings", () => {
  const ev = (id: string, s: string, e: string, delay = 0) => ({
    id,
    startsAt: `2024-10-12T${s}`,
    endsAt: `2024-10-12T${e}`,
    delayMinutes: delay,
  });

  it("no delays → displayed equals baseline", () => {
    const m = computeDisplayedTimings([
      ev("a", "08:00", "09:00"),
      ev("b", "10:00", "11:00"),
    ]);
    expect(m.get("a")).toMatchObject({
      displayedStart: "2024-10-12T08:00",
      displayedEnd: "2024-10-12T09:00",
      shiftMinutes: 0,
      ownDelay: 0,
    });
    expect(m.get("b")!.displayedStart).toBe("2024-10-12T10:00");
  });

  it("delaying A extends A's end and shifts B; A's start stays", () => {
    const m = computeDisplayedTimings([
      ev("a", "08:00", "09:00", 15),
      ev("b", "10:00", "11:00"),
    ]);
    expect(m.get("a")).toMatchObject({
      displayedStart: "2024-10-12T08:00",
      displayedEnd: "2024-10-12T09:15",
    });
    expect(m.get("b")).toMatchObject({
      displayedStart: "2024-10-12T10:15",
      displayedEnd: "2024-10-12T11:15",
      shiftMinutes: 15,
    });
  });

  it("a negative own-delay shrinks A's end and shifts B earlier", () => {
    const m = computeDisplayedTimings([
      ev("a", "08:00", "09:00", -15),
      ev("b", "10:00", "11:00"),
    ]);
    expect(m.get("a")).toMatchObject({
      displayedStart: "2024-10-12T08:00",
      displayedEnd: "2024-10-12T08:45",
    });
    expect(m.get("b")).toMatchObject({
      displayedStart: "2024-10-12T09:45",
      displayedEnd: "2024-10-12T10:45",
      shiftMinutes: -15,
    });
  });

  it("stacks delays across multiple events", () => {
    const m = computeDisplayedTimings([
      ev("a", "08:00", "09:00", 15),
      ev("b", "10:00", "11:00", 30),
      ev("c", "12:00", "13:00"),
    ]);
    expect(m.get("a")!.displayedEnd).toBe("2024-10-12T09:15");
    expect(m.get("b")).toMatchObject({
      displayedStart: "2024-10-12T10:15",
      displayedEnd: "2024-10-12T11:45",
      shiftMinutes: 15,
    });
    expect(m.get("c")).toMatchObject({
      displayedStart: "2024-10-12T12:45",
      shiftMinutes: 45,
    });
  });

  it("an event's own (stacked) delay extends only its end by the total", () => {
    // 45 = e.g. a 15 + a 30 delay stacked on the same event (summed upstream).
    const m = computeDisplayedTimings([
      ev("a", "08:00", "09:00", 45),
      ev("b", "10:00", "11:00"),
    ]);
    expect(m.get("a")).toMatchObject({
      displayedStart: "2024-10-12T08:00",
      displayedEnd: "2024-10-12T09:45",
    });
    expect(m.get("b")!.shiftMinutes).toBe(45);
  });

  it("orders by baseline start regardless of input order", () => {
    const m = computeDisplayedTimings([
      ev("b", "10:00", "11:00"),
      ev("a", "08:00", "09:00", 15),
    ]);
    expect(m.get("b")!.shiftMinutes).toBe(15);
    expect(m.get("a")!.shiftMinutes).toBe(0);
  });

  it("propagates across midnight", () => {
    const m = computeDisplayedTimings([
      {
        id: "a",
        startsAt: "2024-10-12T23:30",
        endsAt: "2024-10-12T23:50",
        delayMinutes: 30,
      },
      {
        id: "b",
        startsAt: "2024-10-13T00:10",
        endsAt: "2024-10-13T00:30",
        delayMinutes: 0,
      },
    ]);
    expect(m.get("a")!.displayedEnd).toBe("2024-10-13T00:20");
    expect(m.get("b")!.displayedStart).toBe("2024-10-13T00:40");
  });
});
