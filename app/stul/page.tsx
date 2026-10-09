import { requireUser, getProfile } from "@/lib/auth";
import { getTableSeats, getUnseatedPlayers } from "@/lib/db/table-seats";
import { TableBoard } from "./table-board";

// The permanent seating map. Everyone logged in can VIEW; only admins see the
// edit affordances (enforced in the board UI + each action's isAdmin gate).
export default async function StulPage() {
  const [, profile, seats] = await Promise.all([
    requireUser(),
    getProfile(),
    getTableSeats(),
  ]);
  const admin = profile?.role === "admin";
  // Only admins can open the picker, so only they need the unseated roster.
  const unseated = admin ? await getUnseatedPlayers() : [];

  const column = "mx-auto w-full max-w-[440px] px-[18px]";

  return (
    <main className="w-full pt-2">
      <div className={column}>
        <h1 className="font-display mt-1.5 mb-0.5 text-[27px] font-semibold tracking-[0.01em]">
          Stůl
        </h1>
        <p className="text-muted-foreground mb-[18px] text-xs tracking-[0.16em] uppercase">
          Rozmístění u stolu
        </p>
      </div>
      <div className={column}>
        <TableBoard seats={seats} unseatedPlayers={unseated} isAdmin={admin} />
      </div>
    </main>
  );
}
