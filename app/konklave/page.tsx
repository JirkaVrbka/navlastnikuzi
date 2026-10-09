import { requireUser, getProfile } from "@/lib/auth";
import {
  getRooms,
  getActiveKonklave,
  getArchivedKonklaves,
} from "@/lib/db/konklave";
import { getUsersForPicker } from "@/lib/db/itinerary";
import { getInGamePlayers } from "@/lib/db/players";
import { getSeatNumbersByPlayer } from "@/lib/db/table-seats";
import { RoomsSection } from "./rooms-section";
import { ActiveKonklave } from "./active-konklave";
import { KonklaveBuilder } from "./konklave-builder";
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
  // Overlap auth (requireUser redirect guard + profile lookup) with the data
  // queries in one Promise.all instead of awaiting them serially first.
  const [, profile, rooms, active, archived, users, inGamePlayers, seatMap] =
    await Promise.all([
      requireUser(),
      getProfile(),
      getRooms(),
      getActiveKonklave(),
      getArchivedKonklaves(),
      getUsersForPicker(),
      getInGamePlayers(),
      getSeatNumbersByPlayer(),
    ]);
  const admin = profile?.role === "admin";
  // Plain record (serializable to the client board) of player id → seat number.
  const seatByPlayer = Object.fromEntries(seatMap);

  // The builder AND the active board (doprovod cards + inline toggles) are
  // desktop-wide, so they render in a wider container than the narrow phone
  // column used by the heading, history and rooms.
  const narrow = "mx-auto w-full max-w-[440px] px-[18px]";
  const wide = "mx-auto mb-[18px] w-full max-w-[1100px] px-[18px]";

  return (
    <main className="w-full pt-2">
      <div className={narrow}>
        <h1 className="font-display mt-1.5 mb-0.5 text-[27px] font-semibold tracking-[0.01em]">
          Konkláve
        </h1>
        <p className="text-muted-foreground mb-[18px] text-xs tracking-[0.16em] uppercase">
          Rozmístění hráčů
        </p>
      </div>

      {active ? (
        <div className={wide}>
          <ActiveKonklave
            konklave={active}
            rooms={rooms}
            users={users}
            inGamePlayers={inGamePlayers}
            seatByPlayer={seatByPlayer}
            isAdmin={admin}
          />
        </div>
      ) : admin ? (
        <div className={wide}>
          <KonklaveBuilder
            rooms={rooms}
            players={inGamePlayers}
            organizers={users}
          />
        </div>
      ) : (
        <div className={narrow}>
          <Card className="items-start gap-4 p-6">
            <p className="text-muted-foreground text-sm">
              Žádné aktivní konkláve.
            </p>
          </Card>
        </div>
      )}

      <div className={narrow}>
        <KonklaveHistory konklaves={archived.map(toArchivedView)} />
        <RoomsSection rooms={rooms} />
      </div>
    </main>
  );
}
