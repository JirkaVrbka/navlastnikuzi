import { requireAdmin } from "@/lib/auth";
import {
  getActiveConfession,
  getArchivedConfessions,
  type ArchivedConfession,
} from "@/lib/db/confession";
import { ActiveConfession } from "./active-confession";
import { NewConfessionButton } from "./new-confession-button";
import {
  ConfessionHistory,
  type ArchivedConfessionView,
} from "./confession-history";
import { Card } from "@/components/ui/card";

// An archived zpověď (+ joined placements) → the flat read-only history shape.
function toArchivedView(c: ArchivedConfession): ArchivedConfessionView {
  return {
    id: c.id,
    finishedAt: c.finishedAt,
    placements: c.placements.map((p) => ({
      id: p.id,
      playerName: p.player.nickname?.trim() || p.player.name,
      side: p.side as "a" | "b",
      done: p.done,
      note: p.note,
    })),
  };
}

export default async function ZpovediPage() {
  // Overlap the admin auth check with the data queries in one Promise.all
  // instead of awaiting requireAdmin serially first (it still throws a
  // redirect() that rejects the Promise.all for non-admins).
  const [, active, archived] = await Promise.all([
    requireAdmin(),
    getActiveConfession(),
    getArchivedConfessions(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-2">
      <h1 className="font-display mt-1.5 mb-0.5 text-[27px] font-semibold tracking-[0.01em]">
        Zpovědi
      </h1>
      <p className="text-muted-foreground mb-[18px] text-xs tracking-[0.16em] uppercase">
        Rozdělení hráčů
      </p>

      {active ? (
        <ActiveConfession confession={active} />
      ) : (
        <Card className="items-start gap-4 p-6">
          <p className="text-muted-foreground text-sm">
            Žádná aktivní zpověď. Založte novou z hráčů ve hře.
          </p>
          <NewConfessionButton className="self-start" />
        </Card>
      )}

      <ConfessionHistory confessions={archived.map(toArchivedView)} />
    </main>
  );
}
