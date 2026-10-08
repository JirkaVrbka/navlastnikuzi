import { requireUser, getProfile } from "@/lib/auth";
import { getPlayers } from "@/lib/db/players";
import { PlayersBoard } from "./players-board";

export default async function PlayersPage() {
  // Overlap auth (requireUser redirect guard + profile lookup) with the players
  // query in one Promise.all instead of awaiting them serially first.
  const [, profile, players] = await Promise.all([
    requireUser(),
    getProfile(),
    getPlayers(),
  ]);
  const admin = profile?.role === "admin";

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px]">
      <h1 className="font-display mt-1.5 text-[27px] leading-tight font-semibold tracking-[0.01em]">
        Hráči
      </h1>
      <p className="text-muted-foreground/80 mb-[18px] text-xs tracking-[0.16em] uppercase">
        Přehled účastníků
      </p>

      <PlayersBoard players={players} isAdmin={admin} />
    </main>
  );
}
