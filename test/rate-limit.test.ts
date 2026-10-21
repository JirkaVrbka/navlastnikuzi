import { describe, it, expect, beforeEach, vi } from "vitest";

// checkRateLimit's whole job is to fail OPEN: a limiter bug or outage must
// never turn into a blocked/broken request. Both branches below are mocked —
// no real network call to Upstash — and each test gets a fresh module copy
// (via vi.resetModules + dynamic import) because lib/rate-limit.ts builds its
// Ratelimit instance as a lazy module-level singleton.
describe("checkRateLimit fail-open behaviour", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns true when the Upstash env vars are missing (disabled)", async () => {
    // Redis.fromEnv() throws when UPSTASH_REDIS_REST_URL/TOKEN aren't set —
    // exactly what happens in local dev before an Upstash DB is configured.
    vi.doMock("@upstash/redis", () => ({
      Redis: {
        fromEnv: () => {
          throw new Error("missing UPSTASH_REDIS_REST_URL/TOKEN");
        },
      },
    }));

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(checkRateLimit("test", "1.2.3.4")).resolves.toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("returns true when the Upstash Redis call throws (outage)", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: { fromEnv: () => ({}) }, // a fake client object is enough
    }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {};
        }
        limit() {
          return Promise.reject(new Error("Upstash is unreachable"));
        }
      },
    }));

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(checkRateLimit("mcp", "5.6.7.8")).resolves.toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("returns the limiter's verdict when Upstash responds normally", async () => {
    vi.doMock("@upstash/redis", () => ({
      Redis: { fromEnv: () => ({}) },
    }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {};
        }
        limit() {
          return Promise.resolve({ success: false });
        }
      },
    }));

    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(checkRateLimit("login", "9.9.9.9")).resolves.toBe(false);
  });
});
