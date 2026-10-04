import { createHash, timingSafeEqual } from "node:crypto";

// The MCP endpoint's organizer gate: a static bearer token in MCP_TOKEN. This
// stands in for the web app's requireUser cookie-session check, which an MCP
// client does not have.

export type AuthResult =
  { ok: true } | { ok: false; status: number; message: string };

// Constant-time string compare. Hashing both sides to a fixed-width digest keeps
// the comparison length-independent (timingSafeEqual throws on unequal lengths)
// and avoids leaking the token length via timing.
function constantTimeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Validate the request's Authorization header against MCP_TOKEN.
//   - MCP_TOKEN unset        → 503 (server not configured)
//   - missing/malformed/wrong → 401
export function checkBearer(req: Request): AuthResult {
  const token = process.env.MCP_TOKEN;
  if (!token) {
    return {
      ok: false,
      status: 503,
      message: "MCP server není nakonfigurován (chybí MCP_TOKEN).",
    };
  }
  const header = req.headers.get("authorization") ?? "";
  // The auth-scheme token is case-insensitive per RFC 7235 ("Bearer"/"bearer").
  const match = /^Bearer (.+)$/i.exec(header);
  if (!match || !constantTimeEqual(match[1], token)) {
    return { ok: false, status: 401, message: "Neautorizováno." };
  }
  return { ok: true };
}
