import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/mcp/route";
import { db, closeDb } from "@/lib/db";
import { days } from "@/lib/db/schema";
import { isDbUp } from "./helpers/db";

// Exercises the real endpoint: the bearer gate + the stateless JSON-RPC bridge
// through the MCP SDK. MCP_TOKEN is set to "test-mcp-token" in vitest.config.ts.
const dbUp = await isDbUp();
const TOKEN = "test-mcp-token";

function mcpRequest(body: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    // The Streamable HTTP spec requires the client to accept both types.
    accept: "application/json, text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  if (dbUp) await closeDb();
});

describe("MCP endpoint auth gate", () => {
  it("rejects a request with no token (401)", async () => {
    const res = await POST(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a request with a wrong token (401)", async () => {
    const res = await POST(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }, "nope"),
    );
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!dbUp)("MCP endpoint JSON-RPC (authorized)", () => {
  it("tools/list returns the registered tools", async () => {
    const res = await POST(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }, TOKEN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("create_day");
    expect(names).toContain("cast_vote");
    expect(names.length).toBe(15);
  });

  it("tools/call create_day inserts a row", async () => {
    const label = `MCP route ${randomUUID()}`;
    const res = await POST(
      mcpRequest(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "create_day",
            arguments: { date: "2031-01-01", label },
          },
        },
        TOKEN,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const text: string = body.result.content[0].text;
    const id = text.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )?.[0];
    expect(id).toBeTruthy();
    const [row] = await db.select().from(days).where(eq(days.id, id!));
    expect(row.label).toBe(label);
  });
});
