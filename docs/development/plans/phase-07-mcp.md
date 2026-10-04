# Phase 07 — MCP server (itinerary + players + voting via Claude)

Roadmap phase 7 (was deferred). Confirmed: remote MCP server for external Claude; broad tools; static bearer
token; raw `@modelcontextprotocol/sdk`.

## Assignment (plain)

Expose the app's data to an AI chatbot (Claude Desktop / claude.ai custom connector) over MCP, so an organizer
can say e.g. "přidej snídani 8:00–9:00 do Dne 1" and Claude creates it. One remote MCP endpoint in the app
(`/api/mcp`), protected by a shared bearer token. Tools cover itinerary, players, and voting. Local-first;
hostable on Vercel later.

## Confirmed decisions

- Architecture: **remote MCP server** at `app/api/mcp/route.ts`; the client is external Claude.
- Scope: **broad** — itinerary (days, events, delays), players, voting.
- Auth: **static bearer token** in `MCP_TOKEN` (env), required on every request (`Authorization: Bearer …`).
- Library: **`@modelcontextprotocol/sdk`** (verify current stable, ≥14 days old per supply-chain rule).

## Plan

### Dependency

- Add `@modelcontextprotocol/sdk` (pinned recent-stable). No others.

### Endpoint — `app/api/mcp/route.ts` (Node runtime: `export const runtime = "nodejs"`)

- MCP over **Streamable HTTP, stateless** (one JSON-RPC exchange per POST; simplest, no session store).
  Implement using the SDK `Server` + its protocol handling. If the SDK's `StreamableHTTPServerTransport`
  (Node req/res) does not bridge cleanly to Next's Web `Request`/`Response`, hand-handle the JSON-RPC: parse
  the body, dispatch `initialize` / `tools/list` / `tools/call` through the SDK `Server`, return JSON. Must be
  MCP-protocol-compliant so Claude's connector works.
- **Auth first:** reject with 401 unless `Authorization: Bearer ${MCP_TOKEN}` matches (constant-time compare).
  No token configured → 503 with a clear message. (The token is the organizer gate — like `requireUser` for
  the web app.)

### Shared core (avoid divergence from the web actions)

- Where a web server action's core is non-trivial, extract a plain function the MCP tool and the action both
  call (e.g. `createEventCore(input)` doing the validate+transaction already in app/itinerar/actions.ts;
  reuse the existing `eliminatePlayerById`, `combineDateTime`, `sortCandidates`, and all Zod schemas).
  Thin inserts may be called directly with drizzle. Do NOT duplicate validation — reuse the Zod schemas.
- Tools must NOT call the `"use server"` actions (those gate on the web cookie session, which MCP lacks).

### Tools (broad) — each: zod input, reuse validation + core logic, return a compact text/JSON result

- Itinerary: `list_days` (days+events with displayed/shifted times), `create_day`, `create_event`
  (dayId + times "HH:mm" + fields/items/organizers; fetch day.date, `combineDateTime`), `update_event`,
  `add_delay` (eventId, minutes).
- Players: `list_players` (with drop-out order), `create_player` (name, nickname?), `update_player`,
  `eliminate_player` (id, reason killed|voted_out), `revive_player`, `add_player_note`.
- Voting: `get_active_voting`, `create_voting`, `cast_vote` (candidateId, delta ±1), `end_voting`
  (id, eliminatePlayerId?). Reuse the Phase-6 validation (atomic cast, eliminee must be an in-game candidate,
  single active voting, transactional end).
- Every tool enforces the same invariants as the web path (clamps, checks, CHECK constraints).

### Env / docs

- `MCP_TOKEN` added to `.env.example` (placeholder) and `.env.local` (a dev value). Server reads it.
- A short `docs/mcp.md`: how to connect Claude (the URL `http://127.0.0.1:3000/api/mcp` locally, the bearer
  token header), and the tool list.

### Tests

- Unit/integration (vitest, against the TEST stack): call each tool handler function directly with args and
  assert the DB effect (create day → row; create event → event+children; cast_vote atomic/clamp;
  eliminate via voting sets voted_out; etc.). Plus an HTTP-level test of `route.ts`: a POST without/with a
  bad token → 401; with the token, `tools/list` returns the tools and a `tools/call` create_day works.
- Do NOT attempt a real external-Claude e2e (no MCP client in CI).

## Verification (DoD)

- Test stack up; `npm run typecheck && lint && test && build && test:e2e` green.
- Manual (optional, user): connect claude.ai/Claude Desktop custom connector to the local URL + token, ask it
  to add a day/event, confirm it appears in the app.

## Risks / notes

- The SDK↔Next Web-API bridge is the main integration risk; stateless hand-dispatch is the fallback.
- Local-only until deployed; on Vercel set `MCP_TOKEN` and use the public `/api/mcp` URL.
- Broad tool surface = large; if it runs long, land itinerary tools first, then players, then voting.

## Out of scope

- In-app chatbot / LLM calls. Per-user OAuth. Writing Claude connector config for the user.
