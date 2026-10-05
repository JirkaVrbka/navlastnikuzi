import { z } from "zod";

// Admin mints an MCP token: a human label (1..100 chars) identifying where the
// token is used (e.g. "Claude Desktop — notebook").
export const createTokenSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Zadejte název tokenu")
    .max(100, "Název může mít nejvýše 100 znaků"),
});
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
