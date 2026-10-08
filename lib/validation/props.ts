import { z } from "zod";

// A catalog prop (Rekvizity). `count` is coerced from a string (the numeric
// <input> / MCP arg), like delaySchema; `haveIt` is whether the group
// physically has it. `note` is an optional free-text note.
export const propSchema = z.object({
  name: z.string().trim().min(1, "Zadejte název").max(100),
  count: z.coerce
    .number()
    .int("Zadejte celé číslo")
    .min(0, "Počet nemůže být záporný"),
  haveIt: z.boolean(),
  note: z.string().trim().max(500).optional(),
});
export type PropInput = z.infer<typeof propSchema>;
