import { describe, it, expect, afterEach } from "vitest";
import { checkBearer } from "@/lib/mcp/auth";

// MCP_TOKEN is normally set to "test-mcp-token" in vitest.config.ts. These tests
// exercise the bearer gate directly (no DB), including the "not configured" path.

function req(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  return new Request("http://localhost/api/mcp", { method: "POST", headers });
}

describe("checkBearer", () => {
  const original = process.env.MCP_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.MCP_TOKEN;
    else process.env.MCP_TOKEN = original;
  });

  it("returns 503 (not configured) when MCP_TOKEN is unset", () => {
    delete process.env.MCP_TOKEN;
    const result = checkBearer(req("Bearer anything"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("rejects a missing Authorization header with 401", () => {
    const result = checkBearer(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects a wrong token with 401", () => {
    const result = checkBearer(req("Bearer nope"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("accepts the correct token", () => {
    const result = checkBearer(req("Bearer test-mcp-token"));
    expect(result.ok).toBe(true);
  });

  it("accepts a case-insensitive Bearer scheme (RFC 7235)", () => {
    const result = checkBearer(req("bearer test-mcp-token"));
    expect(result.ok).toBe(true);
  });
});
