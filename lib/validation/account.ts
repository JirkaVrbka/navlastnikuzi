import { z } from "zod";

// Self-service account settings: a logged-in user changes their own data.

// Change display name: a trimmed, non-empty name of at most 100 characters.
export const updateNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Zadejte jméno")
    .max(100, "Jméno může mít nejvýše 100 znaků"),
});
export type UpdateNameInput = z.infer<typeof updateNameSchema>;

// Change password: new password (min 8) that must match its confirmation.
export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Hesla se neshodují",
    path: ["confirm"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
