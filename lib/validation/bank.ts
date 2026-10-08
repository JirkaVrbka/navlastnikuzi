import { z } from "zod";

// A single bank entry as entered in the add/edit form. `potential` is optional:
// when omitted it defaults to `profit` (a mission with no extra upside), and it
// may never be lower than `profit`. Amounts are whole, non-negative koruna.
export const bankEntrySchema = z
  .object({
    mission: z
      .string()
      .trim()
      .min(1, "Zadejte název mise.")
      .max(120, "Název mise je příliš dlouhý."),
    // Guard against a blank/empty submission before coercion: `z.coerce.number()`
    // turns "" into 0, which would silently record a 0 Kč entry. Reject an empty
    // profit with a Czech "required" message while still accepting a numeric
    // string (the dialog passes raw strings) or a number (tests, server args).
    profit: z.preprocess(
      (v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v === "string" && v.trim() === "") return undefined;
        return v;
      },
      z.coerce
        .number({ error: "Zadejte zisk." })
        .int("Zisk musí být celé číslo.")
        .min(0, "Zisk nesmí být záporný."),
    ),
    potential: z.coerce
      .number()
      .int("Potenciál musí být celé číslo.")
      .min(0, "Potenciál nesmí být záporný.")
      .optional(),
  })
  // Fill the default first so the refine below sees a concrete potential.
  .transform((v) => ({
    ...v,
    potential: v.potential ?? v.profit,
  }))
  .refine((v) => v.potential >= v.profit, {
    message: "Potenciál nesmí být nižší než zisk.",
    path: ["potential"],
  });

export type BankEntryInput = z.infer<typeof bankEntrySchema>;
