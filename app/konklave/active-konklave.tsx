"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ActiveKonklave as ActiveKonklaveData,
  RoomRow,
} from "@/lib/db/konklave";
import type { PickableUser } from "@/lib/db/itinerary";
import { setPlacementCheck, updatePlacement } from "./actions";
import { PlacementRow } from "./placement-row";
import { FinishKonklaveDialog } from "./finish-konklave-dialog";
import { Card } from "@/components/ui/card";

// The two per-placement checks, lifted to the parent so a Supabase Realtime
// subscription can keep them in sync with the home "Moje konkláve" section (and
// every other organizer's screen), exactly like the live voting tally.
type Checks = { wentToRoom: boolean; cameBack: boolean };

// The active konkláve: one placement row per in-game player. Room assignments are
// held here so a room taken by one row is removed from every other row's options
// (the server also enforces the one-room-per-player rule). Each room change is
// applied optimistically and reverted — with the server's Czech message — if the
// update is rejected (e.g. the room was taken concurrently). The two checks are
// also lifted here and reconciled live via Realtime (konklave_placements).
export function ActiveKonklave({
  konklave,
  rooms,
  users,
}: {
  konklave: ActiveKonklaveData;
  rooms: RoomRow[];
  users: PickableUser[];
}) {
  const konklaveId = konklave.id;
  const [roomByPlacement, setRoomByPlacement] = useState<
    Record<string, string | null>
  >(() => Object.fromEntries(konklave.placements.map((p) => [p.id, p.roomId])));
  const [checkByPlacement, setCheckByPlacement] = useState<
    Record<string, Checks>
  >(() =>
    Object.fromEntries(
      konklave.placements.map((p) => [
        p.id,
        { wentToRoom: p.wentToRoom, cameBack: p.cameBack },
      ]),
    ),
  );

  // Subscribe to live check changes for THIS konkláve. payload.new carries the
  // full row (replica identity full), so we set both checks authoritatively on
  // every event — toggles made on the home section converge here and vice versa.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`konklave-${konklaveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "konklave_placements",
          filter: `konklave_id=eq.${konklaveId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            went_to_room: boolean;
            came_back: boolean;
          } | null;
          if (!row?.id) return;
          setCheckByPlacement((prev) =>
            prev[row.id]
              ? {
                  ...prev,
                  [row.id]: {
                    wentToRoom: row.went_to_room,
                    cameBack: row.came_back,
                  },
                }
              : prev,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [konklaveId]);

  // Optimistic room assignment lifted to the parent: set locally, persist, and
  // roll back to the prior room (returning the error) if the server rejects it.
  async function changeRoom(
    placementId: string,
    roomId: string | null,
  ): Promise<string> {
    const prev = roomByPlacement[placementId] ?? null;
    setRoomByPlacement((m) => ({ ...m, [placementId]: roomId }));
    const res = await updatePlacement(placementId, { roomId });
    if (res.error) {
      setRoomByPlacement((m) => ({ ...m, [placementId]: prev }));
      return res.error;
    }
    return "";
  }

  // Optimistic check toggle lifted to the parent: flip locally, persist, and
  // roll back (returning the error) if the server rejects it. On success
  // Realtime reconciles every subscribed screen.
  async function changeCheck(
    placementId: string,
    field: "wentToRoom" | "cameBack",
    value: boolean,
  ): Promise<string> {
    const prev = checkByPlacement[placementId];
    if (!prev) return "";
    setCheckByPlacement((m) => ({
      ...m,
      [placementId]: { ...prev, [field]: value },
    }));
    const res = await setPlacementCheck(placementId, field, value);
    if (res.error) {
      setCheckByPlacement((m) => ({ ...m, [placementId]: prev }));
      return res.error;
    }
    return "";
  }

  return (
    <Card className="gap-4 p-4">
      <h2 className="font-display flex items-center gap-2.5 text-[23px] font-semibold">
        <span
          aria-hidden
          className="bg-oxblood-soft size-2 animate-pulse rounded-full shadow-[0_0_10px_var(--oxblood-soft)]"
        />
        Aktivní konkláve
      </h2>

      <ul className="flex flex-col">
        {konklave.placements.map((p) => {
          const currentRoomId = roomByPlacement[p.id] ?? null;
          const checks = checkByPlacement[p.id] ?? {
            wentToRoom: p.wentToRoom,
            cameBack: p.cameBack,
          };
          // Rooms already taken by the OTHER placements — excluded from this
          // row's options so the UI never offers a room twice.
          const takenByOthers = new Set(
            konklave.placements
              .filter((o) => o.id !== p.id)
              .map((o) => roomByPlacement[o.id] ?? null)
              .filter((id): id is string => id !== null),
          );
          const availableRooms = rooms.filter((r) => !takenByOthers.has(r.id));
          return (
            <PlacementRow
              key={p.id}
              placement={p}
              currentRoomId={currentRoomId}
              availableRooms={availableRooms}
              users={users}
              wentToRoom={checks.wentToRoom}
              cameBack={checks.cameBack}
              onChangeRoom={changeRoom}
              onToggleCheck={changeCheck}
            />
          );
        })}
      </ul>

      <FinishKonklaveDialog konklaveId={konklaveId} />
    </Card>
  );
}
