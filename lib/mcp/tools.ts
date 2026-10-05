// MCP tool definitions for the organizer-facing game data (itinerary, players,
// voting). Each tool reuses the SHARED Zod schemas for validation and the SHARED
// service cores (lib/services/*) — never the "use server" web actions, which
// gate on the cookie session the MCP connection does not have. The bearer-token
// gate in app/api/mcp/route.ts is the organizer authorization for every call.
//
// Handlers are exported via `tools` so unit/integration tests can call them
// directly with plain args; registerTools() wires them into an McpServer.

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "@/lib/db";
import { players, playerNotes } from "@/lib/db/schema";
import {
  daySchema,
  eventFormSchema,
  delaySchema,
} from "@/lib/validation/itinerary";
import {
  playerSchema,
  eliminateSchema,
  noteSchema,
} from "@/lib/validation/players";
import { createOrganizerSchema } from "@/lib/validation/auth";
import { getDaysWithEvents } from "@/lib/db/itinerary";
import {
  getPlayers,
  eliminatePlayerById,
  revivePlayerById,
} from "@/lib/db/players";
import { getActiveVoting } from "@/lib/db/voting";
import {
  createDayCore,
  createEventCore,
  updateEventCore,
  addDelayCore,
} from "@/lib/services/itinerary";
import {
  createVotingCore,
  castVoteCore,
  endVotingCore,
} from "@/lib/services/voting";
import { createUserCore, generatePassword } from "@/lib/services/users";
import { computeDisplayedTimings } from "@/lib/domain/delays";
import { computeDropoutOrder } from "@/lib/domain/players";
import { sortCandidates } from "@/lib/domain/voting";

// ── Result helpers ──────────────────────────────────────────────────────────
export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function text(s: string): ToolResult {
  return { content: [{ type: "text", text: s }] };
}
function json(value: unknown): ToolResult {
  return text(JSON.stringify(value, null, 2));
}
function errText(s: string): ToolResult {
  return { content: [{ type: "text", text: s }], isError: true };
}
function firstIssue(e: z.ZodError, fallback = "Neplatné údaje."): string {
  return e.issues[0]?.message ?? fallback;
}

// ── Input schemas (the MCP contract; strict business rules come from the shared
//    domain schemas inside each handler) ────────────────────────────────────
const createEventInput = z.object({
  dayId: z.uuid(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  note: z.string().optional(),
  link: z.string().optional(),
  items: z.array(z.string()).optional(),
  organizers: z
    .array(
      z.object({
        profileId: z.uuid().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
});
const updateEventInput = createEventInput.extend({ id: z.uuid() });
const updatePlayerInput = z.object({
  id: z.uuid(),
  name: z.string(),
  nickname: z.string().optional(),
});
const eliminateInput = eliminateSchema.extend({ id: z.uuid() });
const reviveInput = z.object({ id: z.uuid() });
const addNoteInput = z.object({ playerId: z.uuid(), content: z.string() });
const castVoteInput = z.object({
  candidateId: z.uuid(),
  delta: z.union([z.literal(1), z.literal(-1)]),
});
const endVotingInput = z.object({
  votingId: z.uuid(),
  eliminatePlayerId: z.uuid().nullish(),
});

// ── Tool definition shape ─────────────────────────────────────────────────
type ToolDef = {
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
};

// ── Itinerary ──────────────────────────────────────────────────────────────
async function listDaysHandler(): Promise<ToolResult> {
  const days = await getDaysWithEvents();
  const out = days.map((d) => {
    const timings = computeDisplayedTimings(
      d.events.map((e) => ({
        id: e.id,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        delayMinutes: e.delays.reduce((s, x) => s + x.minutes, 0),
      })),
    );
    return {
      id: d.id,
      date: d.date,
      label: d.label,
      events: d.events.map((e) => {
        const t = timings.get(e.id)!;
        return {
          id: e.id,
          title: e.title,
          baselineStart: e.startsAt,
          baselineEnd: e.endsAt,
          displayedStart: t.displayedStart,
          displayedEnd: t.displayedEnd,
          shiftMinutes: t.shiftMinutes,
          ownDelay: t.ownDelay,
          location: e.location,
          note: e.note,
          link: e.link,
          items: e.items.map((i) => i.content),
          organizers: e.organizers.map(
            (o) => o.profile?.displayName ?? o.profile?.email ?? o.name,
          ),
        };
      }),
    };
  });
  return json(out);
}

async function createDayHandler(args: Record<string, unknown>) {
  const parsed = daySchema.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const id = await createDayCore(parsed.data);
  return text(`Den vytvořen: ${id}`);
}

async function createEventHandler(args: Record<string, unknown>) {
  const input = createEventInput.safeParse(args);
  if (!input.success) return errText(firstIssue(input.error));
  const day = await db.query.days.findFirst({
    where: (d, { eq }) => eq(d.id, input.data.dayId),
  });
  if (!day) return errText("Den neexistuje.");
  const parsed = eventFormSchema.safeParse({
    dayId: input.data.dayId,
    dayDate: day.date,
    title: input.data.title,
    startTime: input.data.startTime,
    endTime: input.data.endTime,
    location: input.data.location,
    note: input.data.note,
    link: input.data.link,
    items: input.data.items ?? [],
    organizers: input.data.organizers ?? [],
  });
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const id = await createEventCore(parsed.data);
  return text(`Událost vytvořena: ${id}`);
}

async function updateEventHandler(args: Record<string, unknown>) {
  const input = updateEventInput.safeParse(args);
  if (!input.success) return errText(firstIssue(input.error));
  // Resolve the EVENT'S OWN day server-side for the time base — never trust the
  // client-passed dayId. An external LLM must not shift the event's timestamps
  // against a different day's date (and update never moves an event to a new day).
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, input.data.id),
    with: { day: true },
  });
  if (!event) return errText("Událost již neexistuje.");
  const parsed = eventFormSchema.safeParse({
    dayId: event.dayId,
    dayDate: event.day.date,
    title: input.data.title,
    startTime: input.data.startTime,
    endTime: input.data.endTime,
    location: input.data.location,
    note: input.data.note,
    link: input.data.link,
    items: input.data.items ?? [],
    organizers: input.data.organizers ?? [],
  });
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const existed = await updateEventCore(input.data.id, parsed.data);
  if (!existed) return errText("Událost již neexistuje.");
  return text("Událost uložena.");
}

async function addDelayHandler(args: Record<string, unknown>) {
  const parsed = delaySchema.safeParse(args);
  if (!parsed.success)
    return errText(firstIssue(parsed.error, "Neplatné zpoždění."));
  await addDelayCore(parsed.data);
  return text(`Zpoždění ${parsed.data.minutes} min přidáno.`);
}

// ── Players ─────────────────────────────────────────────────────────────────
async function listPlayersHandler(): Promise<ToolResult> {
  const rows = await getPlayers();
  const order = computeDropoutOrder(rows);
  return json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      inGame: p.inGame,
      reason: p.reason,
      eliminatedAt: p.eliminatedAt,
      dropoutOrder: order.get(p.id) ?? null,
      notes: p.notes.map((n) => n.content),
    })),
  );
}

async function createPlayerHandler(args: Record<string, unknown>) {
  const parsed = playerSchema.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const [row] = await db
    .insert(players)
    .values({ name: parsed.data.name, nickname: parsed.data.nickname ?? null })
    .returning({ id: players.id });
  return text(`Hráč vytvořen: ${row.id}`);
}

async function updatePlayerHandler(args: Record<string, unknown>) {
  const parsed = updatePlayerInput.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const fields = playerSchema.safeParse({
    name: parsed.data.name,
    nickname: parsed.data.nickname,
  });
  if (!fields.success) return errText(firstIssue(fields.error));
  const upd = await db
    .update(players)
    .set({ name: fields.data.name, nickname: fields.data.nickname ?? null })
    .where(eq(players.id, parsed.data.id))
    .returning({ id: players.id });
  if (upd.length === 0) return errText("Hráč již neexistuje.");
  return text("Hráč uložen.");
}

async function eliminatePlayerHandler(args: Record<string, unknown>) {
  const parsed = eliminateInput.safeParse(args);
  if (!parsed.success)
    return errText(firstIssue(parsed.error, "Neplatný důvod vyřazení."));
  const rows = await eliminatePlayerById(
    db,
    parsed.data.id,
    parsed.data.reason,
  );
  if (rows === 0)
    return errText(
      "Hráče se nepodařilo vyřadit (neexistuje nebo už je vyřazen).",
    );
  return text("Hráč vyřazen.");
}

async function revivePlayerHandler(args: Record<string, unknown>) {
  const parsed = reviveInput.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const rows = await revivePlayerById(db, parsed.data.id);
  if (rows === 0) return errText("Hráč již neexistuje.");
  return text("Hráč vrácen do hry.");
}

async function addPlayerNoteHandler(args: Record<string, unknown>) {
  const parsed = addNoteInput.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const note = noteSchema.safeParse({ content: parsed.data.content });
  if (!note.success) return errText(firstIssue(note.error));
  const player = await db.query.players.findFirst({
    where: (p, { eq }) => eq(p.id, parsed.data.playerId),
  });
  if (!player) return errText("Hráč neexistuje.");
  const existing = await db
    .select({ id: playerNotes.id })
    .from(playerNotes)
    .where(eq(playerNotes.playerId, parsed.data.playerId));
  await db.insert(playerNotes).values({
    playerId: parsed.data.playerId,
    content: note.data.content,
    position: existing.length,
  });
  return text("Poznámka přidána.");
}

// ── Voting ──────────────────────────────────────────────────────────────────
async function getActiveVotingHandler(): Promise<ToolResult> {
  const v = await getActiveVoting();
  if (!v) return text("Žádné aktivní hlasování.");
  const cands = v.candidates.map((c) => ({
    id: c.id,
    playerId: c.player.id,
    name: c.player.name,
    nickname: c.player.nickname,
    votes: c.votes,
    inGame: c.player.inGame,
  }));
  return json({ votingId: v.id, candidates: sortCandidates(cands, "votes") });
}

async function createVotingHandler(): Promise<ToolResult> {
  const r = await createVotingCore();
  if (r.error) return errText(r.error);
  const v = await getActiveVoting();
  return text(`Hlasování založeno (${v?.candidates.length ?? 0} kandidátů).`);
}

async function castVoteHandler(args: Record<string, unknown>) {
  const parsed = castVoteInput.safeParse(args);
  if (!parsed.success)
    return errText(firstIssue(parsed.error, "Neplatná změna hlasů."));
  const r = await castVoteCore(parsed.data.candidateId, parsed.data.delta);
  if (r.error) return errText(r.error);
  return text("Hlas změněn.");
}

async function endVotingHandler(args: Record<string, unknown>) {
  const parsed = endVotingInput.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  const r = await endVotingCore(
    parsed.data.votingId,
    parsed.data.eliminatePlayerId ?? null,
  );
  if (r.error) return errText(r.error);
  return text("Hlasování ukončeno.");
}

// ── Uživatelé ────────────────────────────────────────────────────────────────
async function createOrganizerHandler(args: Record<string, unknown>) {
  const parsed = createOrganizerSchema.safeParse(args);
  if (!parsed.success) return errText(firstIssue(parsed.error));
  // Password is optional over MCP: generate a strong one and surface it ONCE in
  // the result when the caller omits it. The role is always 'organizer' (never
  // admin) — the bearer gate is organizer-level authority, not admin.
  const generated = !parsed.data.password;
  const password = parsed.data.password ?? generatePassword();
  const res = await createUserCore({
    email: parsed.data.email,
    password,
    role: "organizer",
    displayName: parsed.data.displayName ?? null,
  });
  if ("error" in res) return errText(res.error);
  return text(
    generated
      ? `Organizátor vytvořen: ${parsed.data.email} (id ${res.id}). Vygenerované heslo: ${password} — zobrazí se jen teď.`
      : `Organizátor vytvořen: ${parsed.data.email} (id ${res.id}).`,
  );
}

// ── Registry ────────────────────────────────────────────────────────────────
export const tools: Record<string, ToolDef> = {
  list_days: {
    description:
      "Vypíše dny itineráře s událostmi a zobrazenými (posunutými) časy podle zpoždění.",
    inputSchema: {},
    handler: listDaysHandler,
  },
  create_day: {
    description: "Vytvoří nový den (datum YYYY-MM-DD + název).",
    inputSchema: daySchema.shape,
    handler: createDayHandler,
  },
  create_event: {
    description:
      "Vytvoří událost v daném dni. Časy startTime/endTime ve formátu HH:mm.",
    inputSchema: createEventInput.shape,
    handler: createEventHandler,
  },
  update_event: {
    description: "Upraví existující událost (nahradí položky i organizátory).",
    inputSchema: updateEventInput.shape,
    handler: updateEventHandler,
  },
  add_delay: {
    description:
      "Přidá zpoždění (minuty) k události; posune pozdější události dne.",
    inputSchema: delaySchema.shape,
    handler: addDelayHandler,
  },
  list_players: {
    description:
      "Vypíše hráče se stavem, poznámkami a odvozeným pořadím vyřazení.",
    inputSchema: {},
    handler: listPlayersHandler,
  },
  create_player: {
    description: "Vytvoří hráče (jméno, volitelně přezdívka).",
    inputSchema: playerSchema.shape,
    handler: createPlayerHandler,
  },
  update_player: {
    description: "Upraví jméno/přezdívku hráče.",
    inputSchema: updatePlayerInput.shape,
    handler: updatePlayerHandler,
  },
  eliminate_player: {
    description: "Vyřadí hráče ze hry (reason: killed | voted_out).",
    inputSchema: eliminateInput.shape,
    handler: eliminatePlayerHandler,
  },
  revive_player: {
    description: "Vrátí vyřazeného hráče zpět do hry.",
    inputSchema: reviveInput.shape,
    handler: revivePlayerHandler,
  },
  add_player_note: {
    description: "Přidá poznámku k hráči.",
    inputSchema: addNoteInput.shape,
    handler: addPlayerNoteHandler,
  },
  get_active_voting: {
    description: "Vrátí aktivní hlasování s kandidáty seřazenými podle hlasů.",
    inputSchema: {},
    handler: getActiveVotingHandler,
  },
  create_voting: {
    description: "Založí nové hlasování (snímek hráčů ve hře jako kandidátů).",
    inputSchema: {},
    handler: createVotingHandler,
  },
  cast_vote: {
    description: "Změní hlasy kandidáta o delta (+1 / -1), nikdy pod 0.",
    inputSchema: castVoteInput.shape,
    handler: castVoteHandler,
  },
  end_voting: {
    description:
      "Ukončí hlasování; volitelný eliminatePlayerId musí být kandidát ve hře.",
    inputSchema: endVotingInput.shape,
    handler: endVotingHandler,
  },
  create_organizer: {
    description:
      "Vytvoří přihlašovací účet organizátora (role organizer). Heslo je volitelné — když chybí, vygeneruje se a vrátí jednou.",
    inputSchema: createOrganizerSchema.shape,
    handler: createOrganizerHandler,
  },
};

// Register every tool on an McpServer instance (used by the HTTP endpoint).
// EVERY handler is wrapped in one catch-all: an unexpected throw (e.g. a raw
// Postgres/constraint error) is logged server-side and returned to the client
// as a GENERIC Czech message — never the raw DB text, which the SDK would
// otherwise surface verbatim. This is central, so no tool can leak by omitting
// its own try/catch.
export function registerTools(server: McpServer): void {
  for (const [name, def] of Object.entries(tools)) {
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.inputSchema },
      // The SDK pre-parses args against inputSchema; the handler re-validates
      // with the shared domain schemas (same invariants everywhere).
      async (args: unknown) => {
        try {
          return await def.handler((args ?? {}) as Record<string, unknown>);
        } catch (err) {
          console.error(`[mcp] tool "${name}" failed:`, err);
          return errText("Operaci se nepodařilo provést.");
        }
      },
    );
  }
}
