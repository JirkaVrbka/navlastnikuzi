// Candidate sorting — pure, framework/DB-free game logic.
//
// A voting's candidate list can be ordered two ways:
//   - "votes":    most votes first (descending); ties broken by nickname.
//   - "nickname": alphabetically by nickname ascending.
// In both cases the display nickname falls back to the player's name when no
// nickname is set, and a final tie is broken by id so the result is fully
// deterministic (a stable order the animated FLIP reorder can rely on).

export type SortableCandidate = {
  id: string;
  name: string;
  nickname: string | null;
  votes: number;
};

export type SortBy = "votes" | "nickname";

// The name shown/sorted on: the nickname if present, otherwise the player name.
function displayName(c: SortableCandidate): string {
  const nick = c.nickname?.trim();
  return nick && nick.length > 0 ? nick : c.name;
}

// Locale-aware, case-insensitive compare (Czech), stable for equal strings.
function byName(a: SortableCandidate, b: SortableCandidate): number {
  return displayName(a).localeCompare(displayName(b), "cs", {
    sensitivity: "base",
  });
}

function byId(a: SortableCandidate, b: SortableCandidate): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Return a new array sorted by the chosen key. Does not mutate the input.
export function sortCandidates<T extends SortableCandidate>(
  list: T[],
  by: SortBy,
): T[] {
  return [...list].sort((a, b) => {
    if (by === "votes") {
      if (b.votes !== a.votes) return b.votes - a.votes; // votes desc
      const n = byName(a, b); // tie → nickname asc
      if (n !== 0) return n;
      return byId(a, b); // final tie → id
    }
    // by === "nickname"
    const n = byName(a, b);
    if (n !== 0) return n;
    return byId(a, b);
  });
}
