import { z } from "zod";

// Login: email + a non-empty password (real strength is enforced at creation).
export const loginSchema = z.object({
  email: z.email("Zadejte platný e-mail"),
  password: z.string().min(1, "Zadejte heslo"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Admin creates a user: email, password (min 8), role, optional display name.
export const createUserSchema = z.object({
  email: z.email("Zadejte platný e-mail"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  role: z.enum(["admin", "organizer"]),
  displayName: z
    .string()
    .trim()
    .max(100, "Jméno může mít nejvýše 100 znaků")
    .optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
