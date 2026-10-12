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
  const active = players.filter((p) => p.inGame).length;
  const total = players.length;

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px]">
      <h1 className="font-display mt-1.5 text-[27px] leading-tight font-semibold tracking-[0.01em]">
        Hráči
      </h1>
      <div className="mb-[18px] flex items-center justify-between gap-2">
        <p className="text-muted-foreground/80 text-xs tracking-[0.16em] uppercase">
          Přehled účastníků
        </p>
        <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
          <span className="text-gold-bright tabular-nums">{active}</span>
          <span className="tabular-nums"> / {total}</span> ve hře
        </p>
      </div>

      <PlayersBoard players={players} isAdmin={admin} />
    </main>
  );
}
