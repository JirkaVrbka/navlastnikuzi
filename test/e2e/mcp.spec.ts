import { test, expect } from "@playwright/test";

// Proves the MCP endpoint is reachable THROUGH the Next middleware: the cookie-
// session gate must NOT redirect /api/mcp to /login (MCP clients send no Supabase
// cookie). We use the `request` APIRequestContext fixture, which carries NO
// browser cookie, so this exercises the real middleware + route over HTTP.
//
// The bearer is a DB-backed token seeded by test/e2e/global-setup.ts (only its
// SHA-256 hash is stored); this plaintext matches that seeded row.
const MCP_URL = "http://localhost:3100/api/mcp";
const TOKEN = "test-mcp-token";

test("unauthenticated POST /api/mcp is 401 (NOT redirected to /login)", async ({
  request,
}) => {
  const res = await request.post(MCP_URL, {
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    // Surface a redirect as a 3xx status instead of following it to the HTML
    // login page — if the middleware still swallowed the route, this would fail.
    maxRedirects: 0,
  });
  expect(res.status()).toBe(401);
  // Must be a JSON-RPC error body, never the HTML login page.
  const ct = res.headers()["content-type"] ?? "";
  expect(ct).toContain("application/json");
});

test("authorized POST /api/mcp returns 200 and lists tools", async ({
  request,
}) => {
  const res = await request.post(MCP_URL, {
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const names = (body.result.tools as { name: string }[]).map((t) => t.name);
  expect(names).toContain("create_day");
  expect(names).toContain("cast_vote");
  expect(names).toContain("patch_event");
  expect(names.length).toBe(30);
  expect(names).toContain("list_event_items");
  expect(names).toContain("check_event_item");
  expect(names).toContain("uncheck_event_item");
  expect(names).toContain("list_props");
  expect(names).toContain("create_prop");
  expect(names).toContain("update_prop");
  expect(names).toContain("delete_prop");
});
