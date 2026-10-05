import { describe, it, expect, afterAll } from "vitest";
import { checkBearer } from "@/lib/mcp/auth";
import { closeDb } from "@/lib/db";
import { isDbUp } from "./helpers/db";
import { seedMcpToken } from "./helpers/mcp";

// The bearer gate is now DB-backed: the presented token is hashed and looked up
// in mcp_tokens (non-revoked). Header-parsing cases need no DB; the lookup cases
// run only against the TEST stack (ports 553xx — start it with
// `npm run supabase:test:start`).
const dbUp = await isDbUp();

function req(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  return new Request("http://localhost/api/mcp", { method: "POST", headers });
}

afterAll(async () => {
  if (dbUp) await closeDb();
});

describe("checkBearer header parsing", () => {
  it("rejects a missing Authorization header with 401", async () => {
    const result = await checkBearer(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects a malformed Authorization header with 401", async () => {
    const result = await checkBearer(req("Token abc"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });
});

describe.skipIf(!dbUp)("checkBearer DB lookup", () => {
  it("accepts a valid, non-revoked token", async () => {
    const token = await seedMcpToken();
    const result = await checkBearer(req(`Bearer ${token}`));
    expect(result.ok).toBe(true);
  });

  it("accepts a case-insensitive Bearer scheme (RFC 7235)", async () => {
    const token = await seedMcpToken();
    const result = await checkBearer(req(`bearer ${token}`));
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown token with 401", async () => {
    const result = await checkBearer(req("Bearer mcp_does-not-exist"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects a revoked token with 401", async () => {
    const token = await seedMcpToken({ revoked: true });
    const result = await checkBearer(req(`Bearer ${token}`));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });
});
