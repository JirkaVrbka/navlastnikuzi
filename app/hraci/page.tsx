import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPlayers } from "@/lib/db/players";
import { buttonVariants } from "@/components/ui/button";
import { PlayersBoard } from "./players-board";

export default async function PlayersPage() {
  await requireUser();
  const players = await getPlayers();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hráči</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Domů
        </Link>
      </div>

      <PlayersBoard players={players} />
    </main>
  );
}
