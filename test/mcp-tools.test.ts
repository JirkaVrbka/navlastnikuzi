import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { tools, type ToolResult } from "@/lib/mcp/tools";
import { db, closeDb } from "@/lib/db";
import {
  days,
  events,
  eventItems,
  eventDelays,
  players,
  playerNotes,
  votings,
  votingCandidates,
  profiles,
} from "@/lib/db/schema";
import { endVotingCore } from "@/lib/services/voting";
import { isDbUp } from "./helpers/db";

// Integration tests run against the shared Supabase TEST stack and are NEVER
// reset — so every assertion targets rows this test created (unique labels/ids),
// never table counts. No TRUNCATE/DELETE; voting cleanup uses the normal archive
// path (endVotingCore), which is a status update, not a delete.
const dbUp = await isDbUp();

const textOf = (r: ToolResult) => r.content.map((c) => c.text).join("\n");
const idFrom = (r: ToolResult) =>
  textOf(r).match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  )?.[0];

afterAll(async () => {
  if (dbUp) await closeDb();
});

describe.skipIf(!dbUp)("MCP itinerary tools", () => {
  it("create_day inserts a row", async () => {
    const label = `MCP den ${randomUUID()}`;
    const r = await tools.create_day.handler({ date: "2030-05-01", label });
    expect(r.isError).toBeFalsy();
    const id = idFrom(r)!;
    const [row] = await db.select().from(days).where(eq(days.id, id));
    expect(row.label).toBe(label);
    expect(row.date).toBe("2030-05-01");
  });

  it("create_day rejects an invalid date via the shared schema", async () => {
    const r = await tools.create_day.handler({
      date: "2030-13-40",
      label: "x",
    });
    expect(r.isError).toBe(true);
  });

  it("create_event creates the event + items with combineDateTime timestamps", async () => {
    const dayId = idFrom(
      await tools.create_day.handler({
        date: "2030-05-02",
        label: `MCP den ${randomUUID()}`,
      }),
    )!;
    const r = await tools.create_event.handler({
      dayId,
      title: "Snídaně",
      startTime: "08:00",
      endTime: "09:00",
      items: ["káva", "rohlík"],
    });
    expect(r.isError).toBeFalsy();
    const evId = idFrom(r)!;
    const [ev] = await db.select().from(events).where(eq(events.id, evId));
    expect(ev.title).toBe("Snídaně");
    expect(ev.startsAt).toContain("2030-05-02");
    const items = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, evId));
    expect(items.length).toBe(2);
  });

  it("create_event rejects an unsafe link (reuses eventFormSchema)", async () => {
    const dayId = idFrom(
      await tools.create_day.handler({
        date: "2030-05-03",
        label: `MCP den ${randomUUID()}`,
      }),
    )!;
    const r = await tools.create_event.handler({
      dayId,
      title: "X",
      startTime: "08:00",
      endTime: "09:00",
      link: "javascript:alert(1)",
    });
    expect(r.isError).toBe(true);
  });

  it("add_delay appends a delay and list_days shows the shift", async () => {
    const dayId = idFrom(
      await tools.create_day.handler({
        date: "2030-05-04",
        label: `MCP den ${randomUUID()}`,
      }),
    )!;
    const ev1 = idFrom(
      await tools.create_event.handler({
        dayId,
        title: "A",
        startTime: "08:00",
        endTime: "09:00",
      }),
    )!;
    const ev2 = idFrom(
      await tools.create_event.handler({
        dayId,
        title: "B",
        startTime: "09:00",
        endTime: "10:00",
      }),
    )!;
    const dr = await tools.add_delay.handler({ eventId: ev1, minutes: 30 });
    expect(dr.isError).toBeFalsy();
    const delays = await db
      .select()
      .from(eventDelays)
      .where(eq(eventDelays.eventId, ev1));
    expect(delays.some((d) => d.minutes === 30)).toBe(true);

    const listed = JSON.parse(textOf(await tools.list_days.handler({})));
    const day = listed.find((d: { id: string }) => d.id === dayId);
    const e1 = day.events.find((e: { id: string }) => e.id === ev1);
    const e2 = day.events.find((e: { id: string }) => e.id === ev2);
    expect(e1.displayedEnd).toContain("09:30"); // own delay extends end
    expect(e2.displayedStart).toContain("09:30"); // later event shifted
    expect(e2.displayedEnd).toContain("10:30");
  });
});

describe.skipIf(!dbUp)("MCP players tools", () => {
  it("create_player inserts an in-game player", async () => {
    const name = `Hráč ${randomUUID()}`;
    const id = idFrom(
      await tools.create_player.handler({ name, nickname: "Nick" }),
    )!;
    const [p] = await db.select().from(players).where(eq(players.id, id));
    expect(p.name).toBe(name);
    expect(p.nickname).toBe("Nick");
    expect(p.inGame).toBe(true);
  });

  it("eliminate_player (voted_out), re-eliminate rejected, revive, add note", async () => {
    const id = idFrom(
      await tools.create_player.handler({ name: `Hráč ${randomUUID()}` }),
    )!;

    const er = await tools.eliminate_player.handler({
      id,
      reason: "voted_out",
    });
    expect(er.isError).toBeFalsy();
    let [p] = await db.select().from(players).where(eq(players.id, id));
    expect(p.inGame).toBe(false);
    expect(p.reason).toBe("voted_out");
    expect(p.eliminatedAt).not.toBeNull();

    const again = await tools.eliminate_player.handler({
      id,
      reason: "killed",
    });
    expect(again.isError).toBe(true); // already out

    const rv = await tools.revive_player.handler({ id });
    expect(rv.isError).toBeFalsy();
    [p] = await db.select().from(players).where(eq(players.id, id));
    expect(p.inGame).toBe(true);
    expect(p.reason).toBeNull();

    const nr = await tools.add_player_note.handler({
      playerId: id,
      content: "poznámka",
    });
    expect(nr.isError).toBeFalsy();
    const notes = await db
      .select()
      .from(playerNotes)
      .where(eq(playerNotes.playerId, id));
    expect(notes.map((n) => n.content)).toContain("poznámka");
  });
});

describe.skipIf(!dbUp)("MCP voting tools", () => {
  it("cast_vote is atomic and clamps at 0", async () => {
    const pid = idFrom(
      await tools.create_player.handler({ name: `V ${randomUUID()}` }),
    )!;
    const [v] = await db
      .insert(votings)
      .values({ status: "active" })
      .returning({ id: votings.id });
    const [c] = await db
      .insert(votingCandidates)
      .values({ votingId: v.id, playerId: pid, votes: 0 })
      .returning({ id: votingCandidates.id });

    await tools.cast_vote.handler({ candidateId: c.id, delta: 1 });
    await tools.cast_vote.handler({ candidateId: c.id, delta: 1 });
    let [row] = await db
      .select()
      .from(votingCandidates)
      .where(eq(votingCandidates.id, c.id));
    expect(row.votes).toBe(2);

    await tools.cast_vote.handler({ candidateId: c.id, delta: -1 });
    await tools.cast_vote.handler({ candidateId: c.id, delta: -1 });
    await tools.cast_vote.handler({ candidateId: c.id, delta: -1 });
    [row] = await db
      .select()
      .from(votingCandidates)
      .where(eq(votingCandidates.id, c.id));
    expect(row.votes).toBe(0); // clamped, never negative

    await endVotingCore(v.id, null); // archive (status update, not a delete)
  });

  it("end_voting rejects an out-of-game eliminee and archives nothing", async () => {
    const pid = idFrom(
      await tools.create_player.handler({ name: `V ${randomUUID()}` }),
    )!;
    const [v] = await db
      .insert(votings)
      .values({ status: "active" })
      .returning({ id: votings.id });
    await db
      .insert(votingCandidates)
      .values({ votingId: v.id, playerId: pid, votes: 0 });

    await tools.eliminate_player.handler({ id: pid, reason: "killed" });
    const r = await tools.end_voting.handler({
      votingId: v.id,
      eliminatePlayerId: pid,
    });
    expect(r.isError).toBe(true);
    const [still] = await db.select().from(votings).where(eq(votings.id, v.id));
    expect(still.status).toBe("active"); // not archived — invariant held

    await tools.end_voting.handler({ votingId: v.id, eliminatePlayerId: null });
  });

  it("create_voting snapshots in-game players; vote + end eliminates via voting", async () => {
    // Clean slate for the single-active-voting guard (archive any active).
    const active = await db
      .select({ id: votings.id })
      .from(votings)
      .where(eq(votings.status, "active"));
    for (const a of active) await endVotingCore(a.id, null);

    const pid = idFrom(
      await tools.create_player.handler({ name: `W ${randomUUID()}` }),
    )!;
    const cr = await tools.create_voting.handler({});
    expect(cr.isError).toBeFalsy();

    const activeRes = JSON.parse(
      textOf(await tools.get_active_voting.handler({})),
    );
    const cand = activeRes.candidates.find(
      (c: { playerId: string }) => c.playerId === pid,
    );
    expect(cand).toBeTruthy();

    await tools.cast_vote.handler({ candidateId: cand.id, delta: 1 });
    const er = await tools.end_voting.handler({
      votingId: activeRes.votingId,
      eliminatePlayerId: pid,
    });
    expect(er.isError).toBeFalsy();
    const [p] = await db.select().from(players).where(eq(players.id, pid));
    expect(p.inGame).toBe(false);
    expect(p.reason).toBe("voted_out");
  });
});

describe.skipIf(!dbUp)("MCP user tools", () => {
  // The result text embeds the user id after "(id " — parse THAT, never idFrom(),
  // because the unique test e-mail also contains a UUID.
  const userIdFrom = (r: ToolResult) =>
    textOf(r).match(/\(id ([0-9a-f-]{36})\)/i)?.[1];

  it("create_organizer without a password generates one and sets role organizer", async () => {
    const email = `org-${randomUUID()}@test.local`;
    const r = await tools.create_organizer.handler({ email });
    expect(r.isError).toBeFalsy();
    expect(textOf(r)).toContain("Vygenerované heslo:");

    const id = userIdFrom(r)!;
    const [prof] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(prof.role).toBe("organizer");
  });

  it("create_organizer rejects an invalid e-mail", async () => {
    const r = await tools.create_organizer.handler({ email: "not-an-email" });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("e-mail");
  });

  it("create_organizer rejects a duplicate e-mail", async () => {
    const email = `org-${randomUUID()}@test.local`;
    const first = await tools.create_organizer.handler({ email });
    expect(first.isError).toBeFalsy();
    const second = await tools.create_organizer.handler({ email });
    expect(second.isError).toBe(true);
    expect(textOf(second)).toContain("už existuje");
  });

  it("create_organizer with a supplied password never echoes it", async () => {
    const email = `org-${randomUUID()}@test.local`;
    const password = `Heslo-${randomUUID()}`;
    const r = await tools.create_organizer.handler({ email, password });
    expect(r.isError).toBeFalsy();
    expect(textOf(r)).not.toContain(password);
    expect(textOf(r)).not.toContain("Vygenerované heslo");
  });
});
