// Shared, non-server types for the voting UI (a "use server" actions file may
// only export async functions, so shapes live here).

// One voting candidate in the client tally. `id` is the voting_candidates row id
// — the key Realtime payloads (postgres_changes on voting_candidates) and the
// animated FLIP reorder match on. `playerId` is used only as the eliminee value.
// `inGame` is the player's status at page render (murder via /hraci can turn a
// candidate's player out) — used to hide already-out players from the end-voting
// eliminee picker; the server re-validates on end regardless.
export type Candidate = {
  id: string;
  playerId: string;
  name: string;
  nickname: string | null;
  picturePath: string | null;
  votes: number;
  inGame: boolean;
};
