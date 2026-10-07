"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CandidateAvatar } from "@/app/hlasovani/candidate-avatar";
import { setPlacementCheck } from "./actions";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type MyPlacement = {
  id: string;
  playerName: string;
  playerNickname: string | null;
  picturePath: string | null;
  roomName: string | null;
  wentToRoom: boolean;
  cameBack: boolean;
};

type Checks = { wentToRoom: boolean; cameBack: boolean };

// The home "Moje konkláve" section: the placements of the active konkláve that
// this organizer is assigned to, each with the two checks ("V místnosti" / "Zpět
// u stolu"). Toggles persist optimistically and a Supabase Realtime subscription
// (same channel/table/filter as the konkláve page) keeps every screen in sync —
// a toggle here shows live on the konkláve page and vice versa, like the voting
// tally.
export function MyKonklave({
  konklaveId,
  placements,
}: {
  konklaveId: string;
  placements: MyPlacement[];
}) {
  const [checkByPlacement, setCheckByPlacement] = useState<
    Record<string, Checks>
  >(() =>
    Object.fromEntries(
      placements.map((p) => [
        p.id,
        { wentToRoom: p.wentToRoom, cameBack: p.cameBack },
      ]),
    ),
  );
  const [error, setError] = useState("");

  // Subscribe to live check changes for THIS konkláve, but only reconcile the
  // placements shown in this list (checks toggled on the konkláve page or by
  // another organizer converge here). payload.new carries the full row.
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

  // Optimistic toggle: flip locally, persist, revert on error. On success
  // Realtime reconciles this list and the konkláve page.
  function toggle(
    placementId: string,
    field: "wentToRoom" | "cameBack",
    next: boolean,
  ) {
    setError("");
    const prev = checkByPlacement[placementId];
    if (!prev) return;
    setCheckByPlacement((m) => ({
      ...m,
      [placementId]: { ...prev, [field]: next },
    }));
    void setPlacementCheck(placementId, field, next)
      .then((res) => {
        if (res.error) {
          setCheckByPlacement((m) => ({ ...m, [placementId]: prev }));
          setError(res.error);
        }
      })
      .catch(() => {
        setCheckByPlacement((m) => ({ ...m, [placementId]: prev }));
        setError("Nepodařilo se uložit změnu.");
      });
  }

  return (
    <Card className="mt-4 gap-4 p-4">
      <div>
        <h2 className="font-display flex items-center gap-2.5 text-[23px] leading-tight font-semibold">
          <span
            aria-hidden
            className="bg-oxblood-soft size-2 animate-pulse rounded-full shadow-[0_0_10px_var(--oxblood-soft)]"
          />
          Moje konkláve
        </h2>
        <p className="text-muted-foreground/80 mt-1 text-[11px] tracking-[0.12em] uppercase">
          Moje umístění hráčů
        </p>
      </div>

      {error ? (
        <p className="text-red text-xs" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col">
        {placements.map((p) => {
          const checks = checkByPlacement[p.id] ?? {
            wentToRoom: p.wentToRoom,
            cameBack: p.cameBack,
          };
          const displayName = p.playerNickname?.trim() || p.playerName;
          const wentId = `my-went-${p.id}`;
          const backId = `my-back-${p.id}`;
          return (
            <li
              key={p.id}
              className="border-border flex min-h-[44px] flex-col gap-3 border-t py-3 first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <CandidateAvatar
                  name={p.playerName}
                  nickname={p.playerNickname}
                  picturePath={p.picturePath}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate text-[19px] leading-tight font-semibold">
                    {displayName}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {p.roomName ?? "bez místnosti"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <div className="flex min-h-[44px] items-center gap-2.5">
                  <Checkbox
                    id={wentId}
                    className="size-5"
                    checked={checks.wentToRoom}
                    onCheckedChange={(value) =>
                      toggle(p.id, "wentToRoom", value)
                    }
                  />
                  <label
                    htmlFor={wentId}
                    className="cursor-pointer text-[15px] select-none"
                  >
                    V místnosti
                  </label>
                </div>
                <div className="flex min-h-[44px] items-center gap-2.5">
                  <Checkbox
                    id={backId}
                    className="size-5"
                    checked={checks.cameBack}
                    onCheckedChange={(value) => toggle(p.id, "cameBack", value)}
                  />
                  <label
                    htmlFor={backId}
                    className="cursor-pointer text-[15px] select-none"
                  >
                    Zpět u stolu
                  </label>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
