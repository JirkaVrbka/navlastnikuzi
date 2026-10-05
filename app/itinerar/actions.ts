"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { days, events, eventDelays } from "@/lib/db/schema";
import {
  daySchema,
  eventFormSchema,
  delaySchema,
  toggleItemSchema,
  fieldErrorsOf,
} from "@/lib/validation/itinerary";
import {
  createDayCore,
  createEventCore,
  updateEventCore,
  addDelayCore,
} from "@/lib/services/itinerary";
import { setEventItemChecked } from "@/lib/db/itinerary";
import type { ActionState, EventFormState } from "./types";

const ok = (success = ""): ActionState => ({ error: "", success });
const fail = (error: string): ActionState => ({ error, success: "" });

// ── Days ──────────────────────────────────────────────────────────────────
export async function createDay(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = daySchema.safeParse({
    date: fd.get("date"),
    label: fd.get("label"),
  });
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Neplatné údaje.");
  try {
    await createDayCore(parsed.data);
  } catch {
    return fail("Nepodařilo se vytvořit den.");
  }
  revalidatePath("/itinerar");
  return ok("Den byl vytvořen.");
}

export async function updateDay(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return fail("Chybí identifikátor dne.");
  const parsed = daySchema.safeParse({
    date: fd.get("date"),
    label: fd.get("label"),
  });
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Neplatné údaje.");
  try {
    const upd = await db
      .update(days)
      .set(parsed.data)
      .where(eq(days.id, id))
      .returning({ id: days.id });
    if (upd.length === 0) return fail("Den již neexistuje.");
  } catch {
    return fail("Nepodařilo se uložit den.");
  }
  revalidatePath("/itinerar");
  return ok("Den byl uložen.");
}

export async function deleteDay(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  try {
    await db.delete(days).where(eq(days.id, id));
  } catch {
    // Void action — nothing to surface.
  }
  revalidatePath("/itinerar");
}

// ── Events ────────────────────────────────────────────────────────────────

// If a validation error is confined to hidden, server-sourced fields
// (dayId/dayDate), also show a general message so it isn't a silent no-op.
function withHiddenFallback(
  fieldErrors: Record<string, string>,
): EventFormState {
  const visibleKeys = Object.keys(fieldErrors).filter(
    (k) => k !== "dayId" && k !== "dayDate",
  );
  return visibleKeys.length === 0
    ? { fieldErrors, formError: "Neplatné údaje formuláře." }
    : { fieldErrors };
}

function readEventInput(fd: FormData) {
  const userIds = Array.from(
    new Set(fd.getAll("organizerUserIds").map(String).filter(Boolean)),
  );
  const names = Array.from(
    new Set(
      fd
        .getAll("organizerNames")
        .map((n) => String(n).trim())
        .filter(Boolean),
    ),
  );
  const items = fd
    .getAll("items")
    .map((i) => String(i).trim())
    .filter(Boolean);
  return {
    dayId: String(fd.get("dayId") ?? ""),
    dayDate: String(fd.get("dayDate") ?? ""),
    title: String(fd.get("title") ?? ""),
    startTime: String(fd.get("startTime") ?? ""),
    endTime: String(fd.get("endTime") ?? ""),
    location: ((fd.get("location") as string | null) ?? "").trim() || undefined,
    note: ((fd.get("note") as string | null) ?? "").trim() || undefined,
    link: ((fd.get("link") as string | null) ?? "").trim() || undefined,
    items,
    organizers: [
      ...userIds.map((profileId) => ({ profileId })),
      ...names.map((name) => ({ name })),
    ],
  };
}

export async function createEvent(
  _prev: EventFormState,
  fd: FormData,
): Promise<EventFormState> {
  await requireUser();
  const parsed = eventFormSchema.safeParse(readEventInput(fd));
  if (!parsed.success) return withHiddenFallback(fieldErrorsOf(parsed.error));

  try {
    await createEventCore(parsed.data);
  } catch {
    return { formError: "Nepodařilo se vytvořit událost." };
  }

  revalidatePath("/itinerar");
  return { success: "Událost byla vytvořena." };
}

export async function updateEvent(
  _prev: EventFormState,
  fd: FormData,
): Promise<EventFormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return { formError: "Chybí identifikátor události." };
  const parsed = eventFormSchema.safeParse(readEventInput(fd));
  if (!parsed.success) return withHiddenFallback(fieldErrorsOf(parsed.error));

  try {
    const existed = await updateEventCore(id, parsed.data);
    if (!existed) return { formError: "Událost již neexistuje." };
  } catch {
    return { formError: "Nepodařilo se uložit událost." };
  }

  revalidatePath("/itinerar");
  return { success: "Událost byla uložena." };
}

export async function deleteEvent(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  try {
    await db.delete(events).where(eq(events.id, id)); // cascade removes children
  } catch {
    // Void action — nothing to surface.
  }
  revalidatePath("/itinerar");
}

// ── Delays ────────────────────────────────────────────────────────────────
export async function addDelay(fd: FormData): Promise<{ error?: string }> {
  await requireUser();
  const parsed = delaySchema.safeParse({
    eventId: fd.get("eventId"),
    minutes: fd.get("minutes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné zpoždění." };
  }
  try {
    await addDelayCore(parsed.data);
  } catch {
    return { error: "Nepodařilo se přidat zpoždění." };
  }
  revalidatePath("/itinerar");
  return {};
}

export async function removeDelay(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  try {
    await db.delete(eventDelays).where(eq(eventDelays.id, id));
  } catch {
    // Void action — nothing to surface.
  }
  revalidatePath("/itinerar");
}

// ── Rekvizity (checklist) ───────────────────────────────────────────────────
// Toggle a single prop's checklist state. Called directly from the client
// checklist component (not a form), so it THROWS on any failure — the caller's
// optimistic update reverts on a rejected promise.
export async function toggleEventItem(itemId: string, checked: boolean) {
  await requireUser();
  const parsed = toggleItemSchema.safeParse({ itemId, checked });
  if (!parsed.success) throw new Error("Neplatná položka.");
  const rows = await setEventItemChecked(
    db,
    parsed.data.itemId,
    parsed.data.checked,
  );
  if (rows === 0) throw new Error("Položka již neexistuje.");
  revalidatePath("/itinerar");
}
