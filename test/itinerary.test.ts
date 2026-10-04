import { describe, it, expect } from "vitest";
import {
  daySchema,
  eventFormSchema,
  delaySchema,
  fieldErrorsOf,
  isValidDate,
  isValidTime,
  addDays,
  combineDateTime,
} from "@/lib/validation/itinerary";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("delaySchema", () => {
  it("accepts a preset amount", () =>
    expect(
      delaySchema.safeParse({ eventId: UUID, minutes: "15" }).success,
    ).toBe(true));
  it("rejects zero / negative", () => {
    expect(delaySchema.safeParse({ eventId: UUID, minutes: "0" }).success).toBe(
      false,
    );
    expect(
      delaySchema.safeParse({ eventId: UUID, minutes: "-5" }).success,
    ).toBe(false);
  });
  it("rejects above the 600 cap", () =>
    expect(
      delaySchema.safeParse({ eventId: UUID, minutes: "601" }).success,
    ).toBe(false));
  it("rejects a non-integer", () =>
    expect(
      delaySchema.safeParse({ eventId: UUID, minutes: "12.5" }).success,
    ).toBe(false));
});

describe("isValidDate", () => {
  it("accepts a real date", () => expect(isValidDate("2024-10-12")).toBe(true));
  it("rejects an impossible date", () =>
    expect(isValidDate("2024-13-40")).toBe(false));
  it("rejects Feb 30", () => expect(isValidDate("2024-02-30")).toBe(false));
});

describe("isValidTime", () => {
  it("accepts HH:mm", () => {
    expect(isValidTime("08:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
  });
  it("rejects out-of-range or malformed", () => {
    expect(isValidTime("25:00")).toBe(false);
    expect(isValidTime("08:60")).toBe(false);
    expect(isValidTime("8:00")).toBe(false);
    expect(isValidTime("nonsense")).toBe(false);
  });
});

describe("addDays", () => {
  it("adds within a month", () =>
    expect(addDays("2024-10-12", 1)).toBe("2024-10-13"));
  it("rolls over a year", () =>
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01"));
  it("handles a leap day", () =>
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"));
});

describe("combineDateTime", () => {
  it("keeps the same day when end ≥ start", () => {
    expect(combineDateTime("2024-10-12", "08:00", "09:00")).toEqual({
      startsAt: "2024-10-12T08:00",
      endsAt: "2024-10-12T09:00",
    });
  });
  it("rolls the end to the next day when it crosses midnight", () => {
    expect(combineDateTime("2024-10-12", "23:00", "01:00")).toEqual({
      startsAt: "2024-10-12T23:00",
      endsAt: "2024-10-13T01:00",
    });
  });
});

describe("daySchema", () => {
  it("accepts a valid date + label", () =>
    expect(
      daySchema.safeParse({ date: "2024-10-12", label: "Den 1" }).success,
    ).toBe(true));
  it("rejects an impossible date", () =>
    expect(
      daySchema.safeParse({ date: "2024-13-40", label: "x" }).success,
    ).toBe(false));
  it("rejects an empty label", () =>
    expect(daySchema.safeParse({ date: "2024-10-12", label: "" }).success).toBe(
      false,
    ));
});

describe("eventFormSchema", () => {
  const base = {
    dayId: "11111111-1111-4111-8111-111111111111",
    dayDate: "2024-10-12",
    title: "Snídaně",
    startTime: "08:00",
    endTime: "09:00",
    items: [],
    organizers: [],
  };

  it("accepts a valid event", () =>
    expect(eventFormSchema.safeParse(base).success).toBe(true));

  it("accepts a valid document link", () =>
    expect(
      eventFormSchema.safeParse({ ...base, link: "https://example.com/doc" })
        .success,
    ).toBe(true));

  it("rejects a malformed link", () =>
    expect(
      eventFormSchema.safeParse({ ...base, link: "notaurl" }).success,
    ).toBe(false));

  it("rejects a non-http(s) link (javascript:)", () =>
    expect(
      eventFormSchema.safeParse({ ...base, link: "javascript:alert(1)" })
        .success,
    ).toBe(false));

  it("allows no link (optional)", () =>
    expect(eventFormSchema.safeParse(base).success).toBe(true));

  it("reports a field error for an empty title", () => {
    const r = eventFormSchema.safeParse({ ...base, title: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrorsOf(r.error).title).toBe("Zadejte název události");
    }
  });

  it("rejects a bad start time", () =>
    expect(
      eventFormSchema.safeParse({ ...base, startTime: "25:00" }).success,
    ).toBe(false));

  it("rejects an organizer with neither user nor name", () =>
    expect(
      eventFormSchema.safeParse({ ...base, organizers: [{}] }).success,
    ).toBe(false));

  it("accepts organizers given as a user id or a free-text name", () =>
    expect(
      eventFormSchema.safeParse({
        ...base,
        organizers: [
          { profileId: "22222222-2222-4222-8222-222222222222" },
          { name: "Petr" },
        ],
      }).success,
    ).toBe(true));
});
