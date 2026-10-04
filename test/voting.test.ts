import { describe, it, expect } from "vitest";
import { sortCandidates, type SortableCandidate } from "@/lib/domain/voting";

const c = (
  id: string,
  nickname: string | null,
  votes: number,
  name = `name-${id}`,
): SortableCandidate => ({ id, name, nickname, votes });

describe("sortCandidates — by votes", () => {
  it("orders by votes descending", () => {
    const out = sortCandidates(
      [c("a", "Ann", 2), c("b", "Bob", 5), c("d", "Dan", 1)],
      "votes",
    );
    expect(out.map((x) => x.id)).toEqual(["b", "a", "d"]);
  });

  it("breaks a votes tie by nickname (ascending)", () => {
    const out = sortCandidates(
      [c("a", "Zoe", 3), c("b", "Ada", 3), c("d", "Mia", 3)],
      "votes",
    );
    expect(out.map((x) => x.id)).toEqual(["b", "d", "a"]);
  });

  it("falls back to the player name when a nickname is missing", () => {
    const out = sortCandidates(
      [c("a", null, 1, "Zed"), c("b", null, 1, "Ada")],
      "votes",
    );
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("breaks a full tie (votes + name) by id, deterministically", () => {
    const out = sortCandidates(
      [c("z", "Sam", 2), c("a", "Sam", 2), c("m", "Sam", 2)],
      "votes",
    );
    expect(out.map((x) => x.id)).toEqual(["a", "m", "z"]);
  });
});

describe("sortCandidates — by nickname", () => {
  it("orders alphabetically (case-insensitive), ignoring votes", () => {
    const out = sortCandidates(
      [c("a", "bob", 99), c("b", "Ada", 0), c("d", "Cyril", 50)],
      "nickname",
    );
    expect(out.map((x) => x.id)).toEqual(["b", "a", "d"]);
  });

  it("breaks a name tie by id", () => {
    const out = sortCandidates(
      [c("z", "Sam", 1), c("a", "Sam", 9)],
      "nickname",
    );
    expect(out.map((x) => x.id)).toEqual(["a", "z"]);
  });
});

describe("sortCandidates — purity", () => {
  it("does not mutate the input array", () => {
    const input = [c("a", "Ann", 1), c("b", "Bob", 2)];
    const snapshot = input.map((x) => x.id);
    sortCandidates(input, "votes");
    expect(input.map((x) => x.id)).toEqual(snapshot);
  });
});
