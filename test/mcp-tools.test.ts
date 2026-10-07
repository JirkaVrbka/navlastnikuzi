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
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PHOTO_BYTES } from "@/lib/validation/players";
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

describe.skipIf(!dbUp)("MCP rekvizity (checklist) tools", () => {
  it("check/uncheck persist and list_event_items filters by state", async () => {
    const dayId = idFrom(
      await tools.create_day.handler({
        date: "2030-06-01",
        label: `MCP den ${randomUUID()}`,
      }),
    )!;
    // Unique contents so this test only ever asserts on its own rows.
    const a = `baterka ${randomUUID()}`;
    const b = `lano ${randomUUID()}`;
    const evId = idFrom(
      await tools.create_event.handler({
        dayId,
        title: "Výbava",
        startTime: "08:00",
        endTime: "09:00",
        items: [a, b],
      }),
    )!;

    const itemRows = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.eventId, evId));
    const itemA = itemRows.find((r) => r.content === a)!;
    const itemB = itemRows.find((r) => r.content === b)!;
    expect(itemA.checked).toBe(false);
    expect(itemB.checked).toBe(false);

    const listContents = (r: ToolResult): string[] =>
      JSON.parse(textOf(r)).map((x: { content: string }) => x.content);

    // Check item A.
    const cr = await tools.check_event_item.handler({ itemId: itemA.id });
    expect(cr.isError).toBeFalsy();

    const checked = listContents(
      await tools.list_event_items.handler({
        eventId: evId,
        filter: "checked",
      }),
    );
    expect(checked).toContain(a);
    expect(checked).not.toContain(b);

    const unchecked = listContents(
      await tools.list_event_items.handler({
        eventId: evId,
        filter: "unchecked",
      }),
    );
    expect(unchecked).toContain(b);
    expect(unchecked).not.toContain(a);

    const all = listContents(
      await tools.list_event_items.handler({ eventId: evId, filter: "all" }),
    );
    expect(all).toContain(a);
    expect(all).toContain(b);

    // Uncheck flips it back.
    const ur = await tools.uncheck_event_item.handler({ itemId: itemA.id });
    expect(ur.isError).toBeFalsy();
    const checkedAfter = listContents(
      await tools.list_event_items.handler({
        eventId: evId,
        filter: "checked",
      }),
    );
    expect(checkedAfter).not.toContain(a);
  });

  it("check_event_item rejects an unknown id", async () => {
    const r = await tools.check_event_item.handler({ itemId: randomUUID() });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("neexistuje");
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

describe.skipIf(!dbUp)("MCP set_player_photo tool", () => {
  // A valid 1×1 transparent PNG (bytes decoded from this base64 are uploaded).
  const PNG_1X1_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const BUCKET = "player-photos";
  const objectExists = async (path: string): Promise<boolean> => {
    const { data, error } = await createAdminClient()
      .storage.from(BUCKET)
      .download(path);
    return !error && !!data;
  };
  const newPlayer = async () =>
    idFrom(
      await tools.create_player.handler({ name: `Foto ${randomUUID()}` }),
    )!;
  const pathOf = async (id: string) => {
    const [p] = await db.select().from(players).where(eq(players.id, id));
    return p.picturePath;
  };

  it("upload mode stores a bucket object and sets picture_path to it", async () => {
    const id = await newPlayer();
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "image/png",
    });
    expect(r.isError).toBeFalsy();
    expect(textOf(r)).toBe("Fotka nastavena.");
    const stored = await pathOf(id);
    expect(stored).toMatch(/^[0-9a-f-]{36}\.png$/i);
    expect(await objectExists(stored!)).toBe(true);
  });

  it("URL mode stores the URL verbatim and uploads nothing", async () => {
    const id = await newPlayer();
    const url = "https://cdn.example.com/photos/abc.jpg";
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageUrl: url,
    });
    expect(r.isError).toBeFalsy();
    expect(await pathOf(id)).toBe(url);
  });

  it("rejects an unsupported MIME type (reuses checkPhoto)", async () => {
    const id = await newPlayer();
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "application/pdf",
    });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatch(/formát/i);
    expect(await pathOf(id)).toBeNull(); // unchanged
  });

  it("rejects an image larger than 5 MB", async () => {
    const id = await newPlayer();
    const tooBig = Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64");
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: tooBig,
      mimeType: "image/png",
    });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatch(/velk/i);
    expect(await pathOf(id)).toBeNull();
  });

  it("rejects when neither mode is given", async () => {
    const id = await newPlayer();
    const r = await tools.set_player_photo.handler({ playerId: id });
    expect(r.isError).toBe(true);
  });

  it("rejects when both modes are given", async () => {
    const id = await newPlayer();
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "image/png",
      imageUrl: "https://cdn.example.com/photos/abc.jpg",
    });
    expect(r.isError).toBe(true);
  });

  it("rejects an unknown playerId", async () => {
    const r = await tools.set_player_photo.handler({
      playerId: randomUUID(),
      imageUrl: "https://cdn.example.com/photos/abc.jpg",
    });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("nenalezen");
  });

  it("replacing an uploaded photo removes the old object", async () => {
    const id = await newPlayer();
    await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "image/png",
    });
    const first = (await pathOf(id))!;
    expect(await objectExists(first)).toBe(true);

    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "image/png",
    });
    expect(r.isError).toBeFalsy();
    const second = (await pathOf(id))!;
    expect(second).not.toBe(first);
    expect(await objectExists(second)).toBe(true);
    expect(await objectExists(first)).toBe(false); // old object cleaned up
  });

  it("switching from a URL to an upload never tries to remove the URL", async () => {
    const id = await newPlayer();
    await tools.set_player_photo.handler({
      playerId: id,
      imageUrl: "https://cdn.example.com/photos/old.jpg",
    });
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "image/png",
    });
    expect(r.isError).toBeFalsy();
    expect(await pathOf(id)).toMatch(/^[0-9a-f-]{36}\.png$/i);
  });

  it("rejects a non-http(s) imageUrl and leaves picture_path unchanged", async () => {
    const id = await newPlayer();
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageUrl: "ftp://example.com/x.jpg",
    });
    expect(r.isError).toBe(true);
    expect(await pathOf(id)).toBeNull(); // unchanged
  });

  it("replacing an uploaded photo with a URL stores the URL and removes the old object", async () => {
    const id = await newPlayer();
    await tools.set_player_photo.handler({
      playerId: id,
      imageBase64: PNG_1X1_BASE64,
      mimeType: "image/png",
    });
    const first = (await pathOf(id))!;
    expect(await objectExists(first)).toBe(true);

    const url = "https://cdn.example.com/photos/new.jpg";
    const r = await tools.set_player_photo.handler({
      playerId: id,
      imageUrl: url,
    });
    expect(r.isError).toBeFalsy();
    expect(await pathOf(id)).toBe(url); // URL stored verbatim
    expect(await objectExists(first)).toBe(false); // old object cleaned up
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
