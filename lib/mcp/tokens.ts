import { createHash, randomBytes } from "node:crypto";

// Mint + hash helpers for the DB-backed MCP bearer tokens (admin-generated at
// /mcp-tokeny). The plaintext is shown once at creation; only hashToken(raw) is
// stored in mcp_tokens.token_hash.

// A fresh token: a short human-recognisable prefix + 256 bits of entropy,
// base64url so it is URL/header-safe. randomBytes is reused the same way as
// app/hraci/actions.ts.
export function generateToken(): string {
  return "mcp_" + randomBytes(32).toString("base64url");
}

// SHA-256 hex digest of the plaintext token (the value stored + looked up).
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
