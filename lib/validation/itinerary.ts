import { z } from "zod";

// A real calendar date in "YYYY-MM-DD" (rejects e.g. 2024-13-40).
export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
  );
}

// A wall-clock time in "HH:mm".
export function isValidTime(s: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

// Add N days to a "YYYY-MM-DD" date, returning "YYYY-MM-DD".
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Combine the day's date with start/end times into naive local timestamps.
// If the end time is earlier than the start, the event crosses midnight, so the
// end is placed on the next day (e.g. a 23:00 → 01:00 night game).
export function combineDateTime(
  dayDate: string,
  startTime: string,
  endTime: string,
): { startsAt: string; endsAt: string } {
  const endDate = endTime < startTime ? addDays(dayDate, 1) : dayDate;
  return {
    startsAt: `${dayDate}T${startTime}`,
    endsAt: `${endDate}T${endTime}`,
  };
}

const MAX_ITEMS = 100;
const MAX_ORGANIZERS = 50;

export const daySchema = z.object({
  date: z.string().refine(isValidDate, "Zadejte platné datum"),
  label: z.string().trim().min(1, "Zadejte název dne").max(100),
});
export type DayInput = z.infer<typeof daySchema>;

const organizerEntrySchema = z
  .object({
    profileId: z.uuid().optional(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .refine((o) => Boolean(o.profileId) || Boolean(o.name), {
    message: "Organizátor musí mít uživatele nebo jméno.",
  });

// Validates the RAW form inputs (time-only), so per-field errors can be surfaced.
// Timestamps are computed from dayDate + times in the action (see combineDateTime).
export const eventFormSchema = z.object({
  dayId: z.uuid(),
  dayDate: z.string().refine(isValidDate, "Neplatné datum dne"),
  title: z.string().trim().min(1, "Zadejte název události").max(200),
  startTime: z.string().refine(isValidTime, "Zadejte platný začátek"),
  endTime: z.string().refine(isValidTime, "Zadejte platný konec"),
  location: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
  // Must be a real http(s) URL — rejects javascript:/data: (rendered as <a href>).
  link: z
    .url("Zadejte platný odkaz")
    .max(1000)
    .refine(
      (u) => /^https?:\/\//i.test(u),
      "Odkaz musí začínat http:// nebo https://",
    )
    .optional(),
  items: z.array(z.string().trim().min(1).max(500)).max(MAX_ITEMS).default([]),
  organizers: z.array(organizerEntrySchema).max(MAX_ORGANIZERS).default([]),
});
export type EventFormInput = z.infer<typeof eventFormSchema>;

// Toggling a single prop's checklist state (web action, called from the client).
export const toggleItemSchema = z.object({
  itemId: z.uuid(),
  checked: z.boolean(),
});
export type ToggleItemInput = z.infer<typeof toggleItemSchema>;

// Checklist filter for the MCP list tool.
export const itemFilterSchema = z.enum(["checked", "unchecked", "all"]);
export type ItemFilter = z.infer<typeof itemFilterSchema>;

// MCP check/uncheck a single item by id.
export const itemIdSchema = z.object({ itemId: z.uuid() });

// MCP list items, optionally scoped to one event and/or a checked/unchecked filter.
export const listItemsSchema = z.object({
  eventId: z.uuid().optional(),
  filter: itemFilterSchema.default("all"),
});

export const delaySchema = z.object({
  eventId: z.uuid(),
  minutes: z.coerce
    .number()
    .int("Zadejte celé minuty")
    .min(1, "Zadejte kladný počet minut")
    .max(600, "Nejvýše 600 minut"),
});
export type DelayInput = z.infer<typeof delaySchema>;

// First error message per top-level field, keyed by field name.
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
