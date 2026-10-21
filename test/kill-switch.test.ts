import { describe, it, expect, beforeEach, vi } from "vitest";

// isMcpEnabled()'s job is the truth table documented in lib/mcp/kill-switch.ts.
// Unlike the rate limiter (fails open), this one fails CLOSED on a read
// error. Each test mocks lib/upstash-redis's getRedis() directly — no real
// network call — and gets a fresh module copy (vi.resetModules + dynamic
// import) because kill-switch.ts has no state of its own but getRedis()'s
// underlying client is a module-level singleton.
describe("isMcpEnabled truth table", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns true when Upstash is not configured (getRedis() is null)", async () => {
    vi.doMock("@/lib/upstash-redis", () => ({ getRedis: () => null }));

    const { isMcpEnabled } = await import("@/lib/mcp/kill-switch");

    await expect(isMcpEnabled()).resolves.toBe(true);
  });

  it("returns true when the key is absent (never toggled, value is null)", async () => {
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => ({ get: () => Promise.resolve(null) }),
    }));

    const { isMcpEnabled } = await import("@/lib/mcp/kill-switch");

    await expect(isMcpEnabled()).resolves.toBe(true);
  });

  it('returns true when the stored value is the "on" sentinel', async () => {
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => ({ get: () => Promise.resolve("1") }),
    }));

    const { isMcpEnabled } = await import("@/lib/mcp/kill-switch");

    await expect(isMcpEnabled()).resolves.toBe(true);
  });

  it('returns false when the stored value is the "off" sentinel "0"', async () => {
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => ({ get: () => Promise.resolve("0") }),
    }));

    const { isMcpEnabled } = await import("@/lib/mcp/kill-switch");

    await expect(isMcpEnabled()).resolves.toBe(false);
  });

  it("returns false (fail-closed) when the Upstash read throws", async () => {
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => ({
        get: () => Promise.reject(new Error("Upstash is unreachable")),
      }),
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { isMcpEnabled } = await import("@/lib/mcp/kill-switch");

    await expect(isMcpEnabled()).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe("setMcpEnabled", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("is a no-op when Upstash is not configured", async () => {
    const set = vi.fn();
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => null,
    }));

    const { setMcpEnabled } = await import("@/lib/mcp/kill-switch");
    await setMcpEnabled(false);

    expect(set).not.toHaveBeenCalled();
  });

  it('writes the "off" sentinel when disabling', async () => {
    const set = vi.fn(() => Promise.resolve("OK"));
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => ({ set }),
    }));

    const { setMcpEnabled } = await import("@/lib/mcp/kill-switch");
    await setMcpEnabled(false);

    expect(set).toHaveBeenCalledWith("mcp:enabled", "0");
  });

  it('writes the "on" sentinel when enabling', async () => {
    const set = vi.fn(() => Promise.resolve("OK"));
    vi.doMock("@/lib/upstash-redis", () => ({
      getRedis: () => ({ set }),
    }));

    const { setMcpEnabled } = await import("@/lib/mcp/kill-switch");
    await setMcpEnabled(true);

    expect(set).toHaveBeenCalledWith("mcp:enabled", "1");
  });
});
