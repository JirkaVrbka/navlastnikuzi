// Remote MCP server over Streamable HTTP, STATELESS (one JSON-RPC exchange per
// POST). External Claude (Claude Desktop / claude.ai custom connector) connects
// here to read + modify the game data. Every request is gated by a static bearer
// token (MCP_TOKEN) — the organizer authorization, standing in for the web app's
// cookie-session requireUser.
//
// Bridging: the SDK's WebStandardStreamableHTTPServerTransport speaks the native
// Fetch Request/Response, so it maps cleanly onto Next's App Router handlers —
// no Node req/res shim needed. A fresh server + transport is built per request
// (stateless), connected, and handed the raw Request; `enableJsonResponse`
// returns a plain JSON body (no SSE) for the simple request/response flow.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/lib/mcp/server";
import { checkBearer } from "@/lib/mcp/auth";

// node:crypto (constant-time compare) + postgres driver require the Node runtime.
export const runtime = "nodejs";
// Never statically optimize/cache: every POST is a live JSON-RPC exchange that
// reads/writes the DB and is gated per request by the bearer token.
export const dynamic = "force-dynamic";

function unauthorized(status: number, message: string): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: status === 503 ? -32002 : -32001, message },
      id: null,
    },
    {
      status,
      headers: status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
    },
  );
}

async function handle(request: Request): Promise<Response> {
  const auth = checkBearer(request);
  if (!auth.ok) return unauthorized(auth.status, auth.message);

  const server = buildMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no session store
    enableJsonResponse: true, // one JSON response per POST (no SSE stream)
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

// GET (server-initiated SSE) and DELETE (session end) are part of the transport
// spec; in stateless mode they are gated the same way and delegated to the SDK.
export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handle(request);
}
