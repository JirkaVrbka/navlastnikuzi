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
  // roll back (returning the error) if the server rejects it. The dependency
  // between the two checks is mirrored client-side so the UI doesn't flash —
  // leaving the room (wentToRoom=false) clears "Zpět" immediately; "Zpět" can't
  // be set while out of the room (that button is disabled). The server enforces
  // the same rule and Realtime reconciles every subscribed screen on success.
  async function changeCheck(
    placementId: string,
    field: "wentToRoom" | "cameBack",
    value: boolean,
  ): Promise<string> {
    const prev = checkByPlacement[placementId];
    if (!prev) return "";
    const next =
      field === "wentToRoom" && !value
        ? { wentToRoom: false, cameBack: false }
        : { ...prev, [field]: value };
    setCheckByPlacement((m) => ({ ...m, [placementId]: next }));
    const res = await setPlacementCheck(placementId, field, value);
    if (res.error) {
      setCheckByPlacement((m) => ({ ...m, [placementId]: prev }));
      return res.error;
    }
    return "";
  }

  // Live meter counts, recomputed from the lifted check state so a toggle here,
  // on the home section, or by another organizer updates both meters at once.
  const total = konklave.placements.length;
  const checksOf = (
    id: string,
    p: { wentToRoom: boolean; cameBack: boolean },
  ) =>
    checkByPlacement[id] ?? { wentToRoom: p.wentToRoom, cameBack: p.cameBack };
  const nRoom = konklave.placements.filter(
    (p) => checksOf(p.id, p).wentToRoom,
  ).length;
  const nBack = konklave.placements.filter(
    (p) => checksOf(p.id, p).cameBack,
  ).length;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <Card className="gap-4 overflow-visible p-4">
      <h2 className="font-display flex items-center gap-2.5 text-[23px] font-semibold">
        <span
          aria-hidden
          className="bg-oxblood-soft size-2 animate-pulse rounded-full shadow-[0_0_10px_var(--oxblood-soft)]"
        />
        Aktivní konkláve
      </h2>

      {/* Sticky glance summary — two progress meters over the live check state. */}
      <div className="bg-background/90 border-border sticky top-0 z-20 -mx-4 flex gap-2.5 border-b px-4 py-3 backdrop-blur-md">
        <div className="border-border flex-1 rounded-xl border bg-[var(--panel)] px-3 py-2">
          <div className="flex items-baseline justify-between gap-1.5">
            <span className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              V místnosti
            </span>
            <span className="font-display text-gold-bright text-[19px] font-bold tabular-nums">
              {nRoom}/{total}
            </span>
          </div>
          <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="from-gold to-gold-bright h-full rounded-full bg-gradient-to-r transition-[width] duration-300"
              style={{ width: `${pct(nRoom)}%` }}
            />
          </div>
        </div>
        <div
          className={`border-border flex-1 rounded-xl border bg-[var(--panel)] px-3 py-2 ${
            nBack === total && total > 0
              ? "ring-green/50 shadow-[0_0_18px_4px_var(--green-bg)] ring-1"
              : ""
          }`}
        >
          <div className="flex items-baseline justify-between gap-1.5">
            <span className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              Zpět u stolu
            </span>
            <span className="font-display text-green text-[19px] font-bold tabular-nums">
              {nBack}/{total}
            </span>
          </div>
          <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="from-green/60 to-green h-full rounded-full bg-gradient-to-r transition-[width] duration-300"
              style={{ width: `${pct(nBack)}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
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
