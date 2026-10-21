// Admin kill-switch for the MCP endpoint (/api/mcp). Lets an admin turn MCP
// off instantly (e.g. to stop abuse or during maintenance) with no redeploy:
// flip a flag in Upstash Redis (the same store rate limiting already uses —
// see lib/upstash-redis.ts) and middleware (edge runtime, see
// lib/supabase/middleware.ts) reads it on every /api/mcp request, BEFORE the
// Node route/DB are touched, returning a bare 404 when disabled.
//
// Reuses the shared Upstash Redis client (lib/upstash-redis.ts) instead of
// building a second client or re-reading env vars.
//
// Sentinel: the key below stores "0" to mean OFF. Any other value, or the
// key being absent (never toggled), means ON — that's what makes "enabled"
// the default, per the truth table:
//
//   Upstash state                           | isMcpEnabled() | why
//   ---------------------------------------- | -------------- | ---------------------------------
//   env vars not configured (e.g. local dev) | true           | feature inactive, MCP always on
//   configured, key absent (never toggled)   | true           | default: on
//   configured, key value "0"                | false          | admin turned it off
//   configured, key value anything else      | true           | on
//   configured, read throws (real outage)    | false          | FAIL CLOSED (see below)
//
// Fail-mode is the OPPOSITE of the rate limiter's (which fails open): a read
// error against a *configured* Upstash store means we can't confirm MCP is
// meant to be on, so we treat it as off (404) rather than risk letting
// requests through during an outage. This function must never throw into
// the request path — every failure is caught here and turned into `false`.

import { getRedis } from "@/lib/upstash-redis";

export const MCP_ENABLED_KEY = "mcp:enabled";

const OFF = "0";
const ON = "1";

export async function isMcpEnabled(): Promise<boolean> {
  const redis = getRedis();
  // Not configured (no Upstash env vars) — the feature is inactive, so MCP
  // behaves exactly like before this feature existed: always on.
  if (!redis) return true;

  try {
    const value = await redis.get<string>(MCP_ENABLED_KEY);
    return value !== OFF;
  } catch (error) {
    console.warn(
      "[kill-switch] Upstash read failed for mcp:enabled, failing CLOSED (MCP disabled):",
      error,
    );
    return false;
  }
}

// Writes the sentinel. Only called from the admin-gated server action on
// /mcp-tokeny (app/mcp-tokeny/actions.ts) — never from the request path.
export async function setMcpEnabled(enabled: boolean): Promise<void> {
  const redis = getRedis();
  // Not configured — there's no store to persist to. isMcpEnabled() will
  // keep returning true regardless, so this is a harmless no-op rather than
  // an error.
  if (!redis) return;

  await redis.set(MCP_ENABLED_KEY, enabled ? ON : OFF);
}
