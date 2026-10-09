"use client";

import { useEffect, useState } from "react";
import { Check, DoorOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CandidateAvatar } from "@/app/hlasovani/candidate-avatar";
import { setPlacementCheck } from "./actions";
import { Card } from "@/components/ui/card";

type MyPlacement = {
  id: string;
  playerName: string;
  playerNickname: string | null;
  picturePath: string | null;
  roomName: string | null;
  seatNumber: number | null;
  wentToRoom: boolean;
  cameBack: boolean;
};

type Checks = { wentToRoom: boolean; cameBack: boolean };

const captionClass =
  "text-muted-foreground text-[10px] tracking-[0.12em] uppercase";

// The home "Moje konkláve" section: the placements of the active konkláve that
// this organizer is assigned to, each as a compact card mirroring the konkláve
// page's placement row — but simplified: the room is view-only (no select), and
// there is no organizer meta and no edit drawer, since there is nothing to edit
// here beyond the two checks. Toggles persist optimistically and a Supabase
// Realtime subscription (same channel/table/filter as the konkláve page) keeps
// every screen in sync — a toggle here shows live on the konkláve page and vice
// versa, like the voting tally.
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
    // Mirror the server dependency: leaving the room clears "Zpět" at once, and
    // "Zpět" can't be set while out of the room (that button is disabled).
    const optimistic =
      field === "wentToRoom" && !next
        ? { wentToRoom: false, cameBack: false }
        : { ...prev, [field]: next };
    setCheckByPlacement((m) => ({ ...m, [placementId]: optimistic }));
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

  const toggleBase =
    "flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1 text-[10px] tracking-[0.06em] uppercase transition-all active:scale-95";
  const toggleOff =
    "border-[var(--line-strong)] bg-[var(--panel-2)] text-muted-foreground";

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

      <ul className="flex flex-col gap-1.5">
        {placements.map((p) => {
          const checks = checkByPlacement[p.id] ?? {
            wentToRoom: p.wentToRoom,
            cameBack: p.cameBack,
          };
          const name = p.playerName;
          const nick = p.playerNickname?.trim() || "";
          // Left spine: muted → in room (gold) → back (green + glow).
          const spine = checks.cameBack
            ? "border-l-green shadow-[0_0_14px_-6px_rgba(127,174,118,0.5)]"
            : checks.wentToRoom
              ? "border-l-gold"
              : "border-l-[var(--line-strong)]";
          return (
            <li
              key={p.id}
              className={`border-border flex items-center gap-3 rounded-lg border border-l-[3px] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] px-2.5 py-2 transition-[border-color,box-shadow] ${spine}`}
            >
              <CandidateAvatar
                name={p.playerName}
                nickname={p.playerNickname}
                picturePath={p.picturePath}
              />
              <span className="min-w-0 flex-1">
                <span className="font-display block truncate text-[17px] leading-tight font-semibold">
                  {name}
                  {nick ? (
                    <em className="text-gold ml-1.5 font-sans text-xs font-normal not-italic">
                      {`„${nick}"`}
                    </em>
                  ) : null}
                </span>
                <span className="mt-1 block truncate text-[11px] leading-tight">
                  <span className={`${captionClass} mr-1.5`}>Místnost</span>
                  {p.roomName ? (
                    <span className="text-gold font-medium">{p.roomName}</span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      bez místnosti
                    </span>
                  )}
                </span>
                {p.seatNumber !== null ? (
                  <span className="mt-0.5 block truncate text-[11px] leading-tight">
                    <span className={`${captionClass} mr-1.5`}>Sedadlo</span>
                    <span className="text-gold font-medium tabular-nums">
                      {p.seatNumber}
                    </span>
                  </span>
                ) : null}
              </span>

              {/* Two checks — same look as the konkláve page row. */}
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  aria-pressed={checks.wentToRoom}
                  onClick={() => toggle(p.id, "wentToRoom", !checks.wentToRoom)}
                  className={`${toggleBase} ${
                    checks.wentToRoom
                      ? "bg-gold/15 border-gold text-gold-bright"
                      : toggleOff
                  }`}
                >
                  <DoorOpen aria-hidden className="size-4" />V pokoji
                </button>
                <button
                  type="button"
                  aria-pressed={checks.cameBack}
                  disabled={!checks.wentToRoom}
                  onClick={() => toggle(p.id, "cameBack", !checks.cameBack)}
                  className={`${toggleBase} ${
                    checks.cameBack
                      ? "bg-green-bg border-green text-green"
                      : toggleOff
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  <Check aria-hidden className="size-4" />
                  Zpět
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
