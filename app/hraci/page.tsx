import { requireUser, getProfile } from "@/lib/auth";
import { getPlayers } from "@/lib/db/players";
import { PlayersBoard } from "./players-board";

export default async function PlayersPage() {
  await requireUser();
  const profile = await getProfile();
  const admin = profile?.role === "admin";
  const players = await getPlayers();

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
