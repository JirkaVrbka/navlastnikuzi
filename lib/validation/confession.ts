import { z } from "zod";

// Which column a placement sits in: Sloupec A / Sloupec B.
export const sideSchema = z.enum(["a", "b"]);
export type Side = z.infer<typeof sideSchema>;

// A per-zpověď note (free text, trimmed). Empty → stored as null by the service.
export const noteSchema = z
  .string()
  .trim()
  .max(500, "Poznámka je příliš dlouhá.");
export type NoteInput = z.infer<typeof noteSchema>;
