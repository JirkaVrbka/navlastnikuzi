// IP-based sliding-window rate limit for the edge middleware (Next.js).
//
// Why this exists: /api/mcp's bearer-token check runs INSIDE the Node route,
// which already costs a serverless invocation (and, for a wrong token, a DB
// lookup) even for junk requests. A flood of junk requests can exhaust the
// hosting quota before the token check ever gets to reject them. This module
// lets middleware (which runs on the edge, before the route/DB are touched)
// reject an abusive IP cheaply.
//
// Upstash's Redis client talks plain HTTPS/fetch ("REST"), not a TCP socket,
// so it works on the edge runtime where a normal DB driver would not.
//
// Fail-open contract: this limiter protects against abuse, but a bug or
// outage in it must NEVER break the app. If Upstash is unreachable, or the
// required env vars are not set (e.g. local dev without an Upstash DB), every
// call below returns `true` (= allowed) instead of throwing. The real
// security boundary (the MCP bearer token, the Supabase login check) still
// runs afterwards — this is just a cheap pre-filter.

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/upstash-redis";

// Built once per server instance (module-level singleton), not per request —
// re-creating the limiter on every call would be wasteful.
// `undefined` means "not built yet"; `null` means "tried and the shared Redis
// client isn't available (env vars missing), stay disabled for the rest of
// this instance's lifetime".
let limiter: Ratelimit | null | undefined;

// Lazily build the shared Ratelimit instance, on top of the shared Upstash
// Redis client (see lib/upstash-redis.ts — also used by the MCP kill-switch,
// so both features reuse one client instead of each reading env separately).
// Returns `null` when that client isn't available (Upstash env vars not set).
function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;

  const redis = getRedis();
  if (!redis) {
    limiter = null;
    return limiter;
  }

  limiter = new Ratelimit({
    redis,
    // 30 requests per rolling 60-second window, per rate-limit key.
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    // We don't need Upstash's request analytics dashboard for this; keep
    // it off to avoid extra writes per request.
    analytics: false,
  });

  return limiter;
}

// Checks whether `ip` may make another request in `bucket` (a namespace per
// route, e.g. "mcp" or "login", so the two routes don't share one quota).
//
// Returns `true` = allowed, `false` = rate-limited. ALWAYS fail-open: any
// thrown error (network issue, Upstash outage, etc.) or a missing/disabled
// limiter resolves to `true` so a limiter problem can never turn into a 500
// or an outage for real users.
export async function checkRateLimit(
  bucket: string,
  ip: string,
): Promise<boolean> {
  const rl = getLimiter();
  if (!rl) {
    console.warn(
      `[rate-limit] disabled (no Upstash env vars) — allowing "${bucket}" request from ${ip}`,
    );
    return true;
  }

  try {
    const { success } = await rl.limit(`${bucket}:${ip}`);
    return success;
  } catch (error) {
    console.warn(
      `[rate-limit] Upstash call failed for "${bucket}:${ip}", failing open:`,
      error,
    );
    return true;
  }
}
