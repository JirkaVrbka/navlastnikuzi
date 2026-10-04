import { describe, it, expect } from "vitest";
import { computeDropoutOrder } from "@/lib/domain/players";
import {
  playerSchema,
  noteSchema,
  eliminateSchema,
  checkPhoto,
  MAX_PHOTO_BYTES,
} from "@/lib/validation/players";

describe("computeDropoutOrder", () => {
  const inGame = (id: string) => ({ id, inGame: true, eliminatedAt: null });
  const out = (id: string, at: string) => ({
    id,
    inGame: false,
    eliminatedAt: at,
  });

  it("no one out → empty map", () => {
    const m = computeDropoutOrder([inGame("a"), inGame("b")]);
    expect(m.size).toBe(0);
  });

  it("ranks out players by elimination time ascending", () => {
    const m = computeDropoutOrder([
      inGame("a"),
      out("b", "2024-10-12T20:00:00Z"),
      out("c", "2024-10-12T18:00:00Z"),
      out("d", "2024-10-12T22:00:00Z"),
    ]);
    expect(m.get("c")).toBe(1); // earliest
    expect(m.get("b")).toBe(2);
    expect(m.get("d")).toBe(3);
    expect(m.has("a")).toBe(false); // in game → absent
  });

  it("breaks ties by id (deterministic)", () => {
    const t = "2024-10-12T20:00:00Z";
    const m = computeDropoutOrder([out("z", t), out("a", t), out("m", t)]);
    expect(m.get("a")).toBe(1);
    expect(m.get("m")).toBe(2);
    expect(m.get("z")).toBe(3);
  });

  it("accepts Date values as well as strings", () => {
    const m = computeDropoutOrder([
      out("b", "2024-10-12T20:00:00Z"),
      {
        id: "a",
        inGame: false,
        eliminatedAt: new Date("2024-10-12T18:00:00Z"),
      },
    ]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(2);
  });

  it("reviving a player removes them and renumbers the rest", () => {
    const base = [
      out("a", "2024-10-12T18:00:00Z"),
      out("b", "2024-10-12T20:00:00Z"),
    ];
    expect(computeDropoutOrder(base).get("a")).toBe(1);
    expect(computeDropoutOrder(base).get("b")).toBe(2);

    // Revive "a": back in game, eliminatedAt nulled → gone from ranking, and
    // "b" (previously #2) becomes #1.
    const revived = [inGame("a"), base[1]];
    const m = computeDropoutOrder(revived);
    expect(m.has("a")).toBe(false);
    expect(m.get("b")).toBe(1);
  });
});

describe("playerSchema", () => {
  it("accepts a name within bounds and trims it", () => {
    const r = playerSchema.safeParse({ name: "  Petr  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("Petr");
  });

  it("rejects an empty name", () => {
    expect(playerSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name over 100 chars", () => {
    expect(playerSchema.safeParse({ name: "x".repeat(101) }).success).toBe(
      false,
    );
  });

  it("allows an optional nickname up to 100 chars", () => {
    expect(
      playerSchema.safeParse({ name: "Petr", nickname: "y".repeat(100) })
        .success,
    ).toBe(true);
    expect(
      playerSchema.safeParse({ name: "Petr", nickname: "y".repeat(101) })
        .success,
    ).toBe(false);
  });
});

describe("noteSchema", () => {
  it("accepts content within bounds", () => {
    expect(noteSchema.safeParse({ content: "Podezřelý" }).success).toBe(true);
  });
  it("rejects empty content", () => {
    expect(noteSchema.safeParse({ content: "   " }).success).toBe(false);
  });
  it("rejects content over 2000 chars", () => {
    expect(noteSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(
      false,
    );
  });
});

describe("checkPhoto", () => {
  it("accepts allowed image types and maps the type to a safe extension", () => {
    expect(checkPhoto({ type: "image/jpeg", size: 1000 })).toEqual({
      ok: true,
      ext: "jpg",
    });
    expect(checkPhoto({ type: "image/png", size: 1000 })).toEqual({
      ok: true,
      ext: "png",
    });
    expect(checkPhoto({ type: "image/webp", size: 1000 })).toEqual({
      ok: true,
      ext: "webp",
    });
    expect(checkPhoto({ type: "image/gif", size: 1000 })).toEqual({
      ok: true,
      ext: "gif",
    });
  });

  it("rejects a non-image type", () => {
    const r = checkPhoto({ type: "application/pdf", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/formát/i);
  });

  it("rejects an empty / unknown type", () => {
    expect(checkPhoto({ type: "", size: 1000 }).ok).toBe(false);
    expect(checkPhoto({ type: "image/svg+xml", size: 1000 }).ok).toBe(false);
  });

  it("rejects a file over the 5 MB size cap", () => {
    const r = checkPhoto({ type: "image/png", size: MAX_PHOTO_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/velk/i);
  });

  it("accepts a file exactly at the size cap", () => {
    expect(checkPhoto({ type: "image/png", size: MAX_PHOTO_BYTES }).ok).toBe(
      true,
    );
  });
});

describe("eliminateSchema", () => {
  it("accepts the two allowed reasons", () => {
    expect(eliminateSchema.safeParse({ reason: "killed" }).success).toBe(true);
    expect(eliminateSchema.safeParse({ reason: "voted_out" }).success).toBe(
      true,
    );
  });
  it("rejects any other reason", () => {
    expect(eliminateSchema.safeParse({ reason: "banished" }).success).toBe(
      false,
    );
    expect(eliminateSchema.safeParse({ reason: "" }).success).toBe(false);
  });
});
