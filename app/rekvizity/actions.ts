"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createProp as createPropRow,
  updateProp as updatePropRow,
  deleteProp as deletePropRow,
} from "@/lib/db/props";
import { propSchema } from "@/lib/validation/props";
import { fieldErrorsOf } from "@/lib/validation/itinerary";
import type { PropFormState } from "./types";

// A duplicate-name collision: Postgres unique violation (SQLSTATE 23505) or a
// message mentioning unique/duplicate. Surfaced as a per-field error. Drizzle
// wraps the driver error, so the code/message may sit on a `cause` — walk the
// chain rather than only inspecting the top-level error.
function isUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e != null; depth++) {
    if (typeof e === "object") {
      const code = (e as { code?: string }).code;
      if (code === "23505") return true;
      const msg = (e as { message?: string }).message;
      if (msg && /unique|duplicate/i.test(msg)) return true;
    }
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

const DUPLICATE_NAME = "Rekvizita s tímto názvem už existuje.";

// Parse the raw form inputs. `haveIt` is a checkbox: present ⇒ true.
function parseForm(fd: FormData) {
  return propSchema.safeParse({
    name: fd.get("name"),
    count: fd.get("count"),
    haveIt: fd.get("haveIt") != null,
    note: ((fd.get("note") as string | null) ?? "").trim() || undefined,
  });
}

export async function createProp(
  _prev: PropFormState,
  fd: FormData,
): Promise<PropFormState> {
  await requireUser();
  const parsed = parseForm(fd);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await createPropRow(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { fieldErrors: { name: DUPLICATE_NAME } };
    }
    return { formError: "Nepodařilo se vytvořit rekvizitu." };
  }

  revalidatePath("/rekvizity");
  return { success: "Rekvizita byla vytvořena." };
}

export async function updateProp(
  _prev: PropFormState,
  fd: FormData,
): Promise<PropFormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return { formError: "Chybí identifikátor rekvizity." };
  const parsed = parseForm(fd);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    const rows = await updatePropRow(id, parsed.data);
    if (rows === 0) return { formError: "Rekvizita již neexistuje." };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { fieldErrors: { name: DUPLICATE_NAME } };
    }
    return { formError: "Nepodařilo se uložit rekvizitu." };
  }

  revalidatePath("/rekvizity");
  return { success: "Rekvizita byla uložena." };
}

export async function deleteProp(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  try {
    await deletePropRow(id);
  } catch {
    // Void action — nothing to surface.
  }
  revalidatePath("/rekvizity");
}
