// Shared Upstash Redis client (edge-compatible: talks plain HTTPS/fetch, not
// a TCP socket), used by two independent features that both need a cheap
// edge-readable store:
//   - lib/rate-limit.ts wraps this in a Ratelimit instance.
//   - lib/mcp/kill-switch.ts reads/writes the MCP on/off flag directly.
// Both reuse this ONE client/env read instead of each calling
// Redis.fromEnv() (and re-reading UPSTASH_REDIS_REST_URL/TOKEN) separately.

import { Redis } from "@upstash/redis";

// Built once per server instance (module-level singleton), not per request.
// `undefined` means "not built yet"; `null` means "tried and the required
// env vars are missing, stay disabled for the rest of this instance's
// lifetime" (expected in local dev before an Upstash DB is configured).
let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  try {
    // Throws when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't set.
    redis = Redis.fromEnv();
  } catch {
    redis = null;
  }

  return redis;
}
