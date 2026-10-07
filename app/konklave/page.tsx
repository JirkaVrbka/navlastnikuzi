import { requireUser } from "@/lib/auth";
import {
  getRooms,
  getActiveKonklave,
  getArchivedKonklaves,
} from "@/lib/db/konklave";
import { getUsersForPicker } from "@/lib/db/itinerary";
import { RoomsSection } from "./rooms-section";
import { ActiveKonklave } from "./active-konklave";
import { NewKonklaveButton } from "./new-konklave-button";
import { KonklaveHistory, type ArchivedKonklaveView } from "./konklave-history";
import { Card } from "@/components/ui/card";
import type { ArchivedKonklave } from "@/lib/db/konklave";

// An archived konkláve (+ joined placements) → the flat read-only history shape.
function toArchivedView(k: ArchivedKonklave): ArchivedKonklaveView {
  return {
    id: k.id,
    finishedAt: k.finishedAt,
    placements: k.placements.map((p) => ({
      id: p.id,
      playerName: p.player.nickname?.trim() || p.player.name,
      roomName: p.room?.name ?? null,
      organizerName: p.organizer
        ? (p.organizer.displayName ?? p.organizer.email)
        : null,
      wentToRoom: p.wentToRoom,
      cameBack: p.cameBack,
    })),
  };
}

export default async function KonklavePage() {
  await requireUser();
  const [rooms, active, archived, users] = await Promise.all([
    getRooms(),
    getActiveKonklave(),
    getArchivedKonklaves(),
    getUsersForPicker(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-2 pb-6">
      <h1 className="font-display mt-1.5 mb-0.5 text-[27px] font-semibold tracking-[0.01em]">
        Konkláve
      </h1>
      <p className="text-muted-foreground mb-[18px] text-xs tracking-[0.16em] uppercase">
        Rozmístění hráčů
      </p>

      {active ? (
        <ActiveKonklave konklave={active} rooms={rooms} users={users} />
      ) : (
        <Card className="items-start gap-4 p-6">
          <p className="text-muted-foreground text-sm">
            Žádné aktivní konkláve. Založte nové z hráčů ve hře.
          </p>
          <NewKonklaveButton className="self-start" />
        </Card>
      )}

      <KonklaveHistory konklaves={archived.map(toArchivedView)} />

      <RoomsSection rooms={rooms} />
    </main>
  );
}
