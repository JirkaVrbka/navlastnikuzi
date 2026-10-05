import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcpTokens } from "@/lib/db/schema";
import { hashToken } from "./tokens";

// The MCP endpoint's organizer gate. Admins mint named tokens at /mcp-tokeny;
// only the SHA-256 hash is stored. This authenticates a request by hashing the
// presented bearer and looking up a non-revoked mcp_tokens row — standing in for
// the web app's requireUser cookie-session check, which an MCP client does not
// have. There is no static env token anymore.

export type AuthResult =
  { ok: true } | { ok: false; status: number; message: string };

// Validate the request's Authorization header against the mcp_tokens table.
//   - missing/malformed header → 401
//   - no matching non-revoked token → 401
//   - DB/lookup error → 503 (fail-closed)
// On success, best-effort stamps last_used_at (never blocks or throws).
//
// Constant-time compare is unnecessary: the presented value is a 256-bit
// high-entropy token looked up by its hash (indexed equality), so there is no
// short-secret timing leak to exploit.
export async function checkBearer(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  // The auth-scheme token is case-insensitive per RFC 7235 ("Bearer"/"bearer").
  const match = /^Bearer (.+)$/i.exec(header);
  if (!match) {
    return { ok: false, status: 401, message: "Neautorizováno." };
  }

  const hash = hashToken(match[1]);
  try {
    const [row] = await db
      .select({ id: mcpTokens.id })
      .from(mcpTokens)
      .where(and(eq(mcpTokens.tokenHash, hash), isNull(mcpTokens.revokedAt)))
      .limit(1);

    if (!row) {
      return { ok: false, status: 401, message: "Neautorizováno." };
    }

    // Best-effort last-used stamp — fire-and-forget so the extra round-trip
    // never blocks the auth response, and never let a write failure throw into
    // the request path.
    void db
      .update(mcpTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(mcpTokens.id, row.id))
      .catch(() => {});

    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 503,
      message: "MCP server je dočasně nedostupný.",
    };
  }
}
