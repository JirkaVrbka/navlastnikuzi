import { z } from "zod";

// Player identity fields (photo + notes + status are handled separately).
export const playerSchema = z.object({
  name: z.string().trim().min(1, "Zadejte jméno").max(100),
  nickname: z.string().trim().max(100).optional(),
});
export type PlayerInput = z.infer<typeof playerSchema>;

// A single note.
export const noteSchema = z.object({
  content: z.string().trim().min(1, "Zadejte poznámku").max(2000),
});
export type NoteInput = z.infer<typeof noteSchema>;

// ── Photo upload guard ──────────────────────────────────────────────────────
// Allowed image types → the safe file extension derived from the TYPE (never
// the client-supplied filename). Pure + dependency-free so it is unit-testable.
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export type PhotoCheck =
  { ok: true; ext: string } | { ok: false; error: string };

// Validate an uploaded photo by its MIME type and size. Returns the safe
// extension on success, or a Czech field error otherwise. Size is checked here
// so the caller can reject before ever reading the file's bytes.
export function checkPhoto(file: { type: string; size: number }): PhotoCheck {
  const ext = PHOTO_TYPES[file.type];
  if (!ext) {
    return {
      ok: false,
      error: "Nepodporovaný formát obrázku (povoleno: JPEG, PNG, WebP, GIF).",
    };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Obrázek je příliš velký (max 5 MB)." };
  }
  return { ok: true, ext };
}

// The reason a player left the game: murdered by traitors or voted out.
export const eliminateSchema = z.object({
  reason: z.enum(["killed", "voted_out"]),
});
export type EliminateInput = z.infer<typeof eliminateSchema>;
export type EliminateReason = EliminateInput["reason"];
