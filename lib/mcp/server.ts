// Builds the MCP server (high-level McpServer) with all game tools registered.
// A fresh instance is created per request by the stateless HTTP endpoint.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools";

export function buildMcpServer(): McpServer {
  const server = new McpServer(
    { name: "navlastnikuzi-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerTools(server);
  return server;
}
