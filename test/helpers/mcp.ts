import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { mcpTokens } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/mcp/tokens";

// Seed an MCP token row on the TEST stack and return its plaintext. Labels/tokens
// are unique per call so the never-reset test DB stays collision-free. Pass
// `{ revoked: true }` to seed an already-revoked token.
export async function seedMcpToken(opts?: {
  revoked?: boolean;
}): Promise<string> {
  const raw = generateToken();
  await db.insert(mcpTokens).values({
    label: `test ${randomUUID()}`,
    tokenHash: hashToken(raw),
    revokedAt: opts?.revoked ? new Date() : null,
  });
  return raw;
}
