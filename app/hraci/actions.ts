"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { players, playerNotes } from "@/lib/db/schema";
import { eliminatePlayerById, revivePlayerById } from "@/lib/db/players";
import { createAdminClient } from "@/lib/supabase/admin";
import { isExternalPhotoUrl } from "@/lib/photos";
import {
  playerSchema,
  noteSchema,
  eliminateSchema,
  checkPhoto,
} from "@/lib/validation/players";
import { fieldErrorsOf } from "@/lib/validation/itinerary";
import type { PlayerFormState } from "./types";

const BUCKET = "player-photos";

// Collect the staged notes (hidden `notes` inputs), validated + de-blanked.
function readNotes(fd: FormData): string[] {
  return fd
    .getAll("notes")
    .map((n) => String(n).trim())
    .filter((n) => noteSchema.safeParse({ content: n }).success);
}

// Upload a validated photo via the service-role admin Storage client
// (RLS-bypassing, server-only) and return its object path. The extension is
// derived from the validated MIME type (checkPhoto), never the client filename.
// Caller guards the requireUser gate and validates type/size beforehand.
async function uploadPhoto(file: File, ext: string): Promise<string> {
  const path = `${randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

// Best-effort removal of a stored photo object. A storage error is swallowed so
// it never fails the surrounding action (the row change has already committed).
// External image URLs (MCP URL mode) are not bucket objects we own, so they are
// never removed — only real `player-photos` object names are.
async function removePhoto(path: string | null | undefined): Promise<void> {
  if (!path || isExternalPhotoUrl(path)) return;
  try {
    await createAdminClient().storage.from(BUCKET).remove([path]);
  } catch {
    // Orphan cleanup is best-effort — ignore storage errors.
  }
}

function photoFrom(fd: FormData): File | null {
  const f = fd.get("photo");
  return f instanceof File && f.size > 0 ? f : null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertNotes(tx: Tx, playerId: string, notes: string[]) {
  if (notes.length > 0) {
    await tx
      .insert(playerNotes)
      .values(
        notes.map((content, position) => ({ playerId, content, position })),
      );
  }
}

// ── Create / update / delete ────────────────────────────────────────────────
export async function createPlayer(
  _prev: PlayerFormState,
  fd: FormData,
): Promise<PlayerFormState> {
  await requireUser();
  const parsed = playerSchema.safeParse({
    name: fd.get("name"),
    nickname: ((fd.get("nickname") as string | null) ?? "").trim() || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const notes = readNotes(fd);

  const photo = photoFrom(fd);
  let ext: string | undefined;
  if (photo) {
    const check = checkPhoto(photo);
    if (!check.ok) return { fieldErrors: { photo: check.error } };
    ext = check.ext;
  }

  try {
    const picturePath = photo ? await uploadPhoto(photo, ext!) : null;
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(players)
        .values({
          name: parsed.data.name,
          nickname: parsed.data.nickname ?? null,
          picturePath,
        })
        .returning({ id: players.id });
      await insertNotes(tx, row.id, notes);
    });
  } catch {
    return { formError: "Nepodařilo se vytvořit hráče." };
  }

  revalidatePath("/hraci");
  return { success: "Hráč byl vytvořen." };
}

export async function updatePlayer(
  _prev: PlayerFormState,
  fd: FormData,
): Promise<PlayerFormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return { formError: "Chybí identifikátor hráče." };
  const parsed = playerSchema.safeParse({
    name: fd.get("name"),
    nickname: ((fd.get("nickname") as string | null) ?? "").trim() || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const notes = readNotes(fd);

  const photo = photoFrom(fd);
  let ext: string | undefined;
  if (photo) {
    const check = checkPhoto(photo);
    if (!check.ok) return { fieldErrors: { photo: check.error } };
    ext = check.ext;
  }

  let oldPath: string | null = null;
  try {
    // A new upload replaces the stored path; no photo leaves it unchanged.
    const picturePath = photo ? await uploadPhoto(photo, ext!) : undefined;
    let existed = true;
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ picturePath: players.picturePath })
        .from(players)
        .where(eq(players.id, id));
      if (!existing) {
        existed = false;
        return;
      }
      oldPath = existing.picturePath;
      await tx
        .update(players)
        .set({
          name: parsed.data.name,
          nickname: parsed.data.nickname ?? null,
          ...(picturePath !== undefined ? { picturePath } : {}),
        })
        .where(eq(players.id, id));
      await tx.delete(playerNotes).where(eq(playerNotes.playerId, id));
      await insertNotes(tx, id, notes);
    });
    if (!existed) return { formError: "Hráč již neexistuje." };
    // A new photo replaced an existing one → remove the now-orphaned object.
    if (picturePath !== undefined && oldPath && oldPath !== picturePath) {
      await removePhoto(oldPath);
    }
  } catch {
    return { formError: "Nepodařilo se uložit hráče." };
  }

  revalidatePath("/hraci");
  return { success: "Hráč byl uložen." };
}

export async function deletePlayer(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  try {
    const [deleted] = await db
      .delete(players)
      .where(eq(players.id, id)) // cascade removes notes
      .returning({ picturePath: players.picturePath });
    // Remove the player's photo object so it does not orphan the bucket.
    await removePhoto(deleted?.picturePath);
  } catch {
    // Void action — nothing to surface.
  }
  revalidatePath("/hraci");
}

// ── Elimination / revival (status owned by the Players feature) ──────────────
export async function eliminatePlayer(
  fd: FormData,
): Promise<{ error?: string }> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Chybí identifikátor hráče." };
  const parsed = eliminateSchema.safeParse({ reason: fd.get("reason") });
  if (!parsed.success) return { error: "Neplatný důvod vyřazení." };
  try {
    const rows = await eliminatePlayerById(db, id, parsed.data.reason);
    if (rows === 0)
      return {
        error: "Hráče se nepodařilo vyřadit (neexistuje nebo už je vyřazen).",
      };
  } catch {
    return { error: "Nepodařilo se vyřadit hráče." };
  }
  revalidatePath("/hraci");
  return {};
}

export async function revivePlayer(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  try {
    await revivePlayerById(db, id);
  } catch {
    // Void action — nothing to surface.
  }
  revalidatePath("/hraci");
}
