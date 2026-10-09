"use client";

import { useEffect, useState } from "react";
import { Check, DoorOpen } from "lucide-react";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/app/hraci/labels";
import { userLabel } from "@/app/itinerar/organizer-picker";
import type {
  ActiveKonklave as ActiveKonklaveData,
  PlacementRow,
  RoomRow,
} from "@/lib/db/konklave";
import type { InGamePlayer } from "@/lib/db/players";
import type { PickableUser } from "@/lib/db/itinerary";
import { setPlacementCheck } from "./actions";
import { FinishKonklaveDialog } from "./finish-konklave-dialog";
import { KonklaveBuilder, type Box } from "./konklave-builder";
import { InitialsAvatar, RoomIcon } from "./chips";
import { PlayerPhoto } from "@/components/player-photo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// The two per-placement checks, lifted to the parent so a Supabase Realtime
// subscription can keep them in sync with the home "Moje konkláve" section (and
// every other organizer's screen), exactly like the live voting tally.
type Checks = { wentToRoom: boolean; cameBack: boolean };

const playerLabelOf = (p: { name: string; nickname: string | null }) =>
  p.nickname?.trim() || p.name;

// Group the active konkláve's placements into doprovod boxes for the edit
// builder: placements with an organizer OR a room join a box keyed by organizer
// (null organizer is allowed — a box with organizerId null). Fully-unassigned
// players (no room AND no organizer) are left out so they land back in the
// builder's "Hráči" source column. Box ids are b1..bN so the builder can advance
// its id sequence past them.
function buildInitialBoxes(placements: PlacementRow[]): Box[] {
  const NONE = "__none__";
  const linesByKey = new Map<
    string,
    { room: string | null; player: string }[]
  >();
  const order: string[] = [];
  for (const p of placements) {
    if (!p.organizerProfileId && !p.roomId) continue;
    const key = p.organizerProfileId ?? NONE;
    if (!linesByKey.has(key)) {
      linesByKey.set(key, []);
      order.push(key);
    }
    linesByKey.get(key)!.push({ room: p.roomId, player: p.playerId });
  }
  return order.map((key, i) => ({
    id: `b${i + 1}`,
    organizerId: key === NONE ? null : key,
    lines: linesByKey.get(key)!,
  }));
}

// One doprovod line: a read-only room chip (or muted "bez místnosti") + the
// player chip + the two live toggles. The toggles reuse the parent's optimistic
// handler (Realtime-synced); "Zpět" is disabled until the player is in the room,
// and leaving the room clears "Zpět" (handled in the parent). Errors from a
// rejected toggle surface inline.
function DoprovodLine({
  placement,
  seatNumber,
  wentToRoom,
  cameBack,
  onToggle,
}: {
  placement: PlacementRow;
  seatNumber: number | null;
  wentToRoom: boolean;
  cameBack: boolean;
  onToggle: (
    placementId: string,
    field: "wentToRoom" | "cameBack",
    value: boolean,
  ) => Promise<string>;
}) {
  const [error, setError] = useState("");
  const label = playerLabelOf(placement.player);

  function toggle(field: "wentToRoom" | "cameBack", next: boolean) {
    setError("");
    void onToggle(placement.id, field, next).then((err) => {
      if (err) setError(err);
    });
  }

  const toggleBase =
    "flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1 text-[10px] tracking-[0.06em] uppercase transition-all active:scale-95";
  const toggleOff =
    "border-[var(--line-strong)] bg-[var(--panel-2)] text-muted-foreground";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {/* Room chip (read-only) */}
        {placement.room ? (
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2.5 py-1.5">
            <RoomIcon className="size-6 rounded-[7px] text-[13px]" />
            <span className="font-display truncate text-[15px] font-semibold">
              {placement.room.name}
            </span>
          </div>
        ) : (
          <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-[10px] border border-dashed border-[var(--line-strong)] bg-black/20 px-2.5 py-1.5">
            <span className="text-muted-foreground truncate text-xs italic">
              bez místnosti
            </span>
          </div>
        )}

        {/* Player chip (read-only) — photo (click to enlarge, reusing the
            /hraci PlayerPhoto lightbox) when one exists, else the initials
            avatar. */}
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-[var(--green)]/40 bg-[var(--green)]/10 px-2.5 py-1.5">
          {placement.player.picturePath ? (
            <PlayerPhoto
              picturePath={placement.player.picturePath}
              name={label}
              sizeClass="size-6"
              initialsTextClass="text-[11px]"
            />
          ) : (
            <InitialsAvatar name={label} className="size-6 text-[11px]" />
          )}
          <span className="font-display truncate text-[15px] font-semibold">
            {label}
          </span>
          {seatNumber !== null ? (
            <span
              className="text-gold ml-auto shrink-0 text-[12px] font-semibold tabular-nums"
              title={`Sedadlo ${seatNumber}`}
            >
              #{seatNumber}
            </span>
          ) : null}
        </div>

        {/* Two live checks */}
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-pressed={wentToRoom}
            onClick={() => toggle("wentToRoom", !wentToRoom)}
            className={cn(
              toggleBase,
              wentToRoom
                ? "bg-gold/15 border-gold text-gold-bright"
                : toggleOff,
            )}
          >
            <DoorOpen aria-hidden className="size-4" />V pokoji
          </button>
          <button
            type="button"
            aria-pressed={cameBack}
            disabled={!wentToRoom}
            onClick={() => toggle("cameBack", !cameBack)}
            className={cn(
              toggleBase,
              cameBack ? "bg-green-bg border-green text-green" : toggleOff,
              "disabled:cursor-not-allowed disabled:opacity-30",
            )}
          >
            <Check aria-hidden className="size-4" />
            Zpět
          </button>
        </div>
      </div>
      {error ? (
        <p className="text-red text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// One doprovod card: an organizer header (avatar + name, read-only — no select)
// above its placement lines. Mirrors the builder's BoxCard look.
function DoprovodCard({
  title,
  hasOrganizer,
  children,
}: {
  title: string;
  hasOrganizer: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--line-strong)] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] p-3 pb-2.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "font-display flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            hasOrganizer
              ? "bg-gradient-to-b from-[var(--gold-bright)] to-[var(--gold)] text-[var(--obsidian)]"
              : "text-muted-foreground border border-dashed border-[var(--line-strong)] bg-black/20",
          )}
        >
          {hasOrganizer ? initials(title) || "?" : "?"}
        </span>
        <span className="font-display min-w-0 flex-1 truncate text-[17px] font-semibold">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

// The active konkláve board: read-only doprovod cards (grouped by organizer)
// with the two live toggles per line, plus the live meters, the Realtime sync,
// the admin Finish button, and an admin "Upravit" that reopens the drag-and-drop
// builder (edit mode) pre-filled with the current arrangement.
export function ActiveKonklave({
  konklave,
  rooms,
  users,
  inGamePlayers,
  seatByPlayer,
  isAdmin,
}: {
  konklave: ActiveKonklaveData;
  rooms: RoomRow[];
  users: PickableUser[];
  inGamePlayers: InGamePlayer[];
  seatByPlayer: Record<string, number>;
  isAdmin: boolean;
}) {
  const konklaveId = konklave.id;
  const [editing, setEditing] = useState(false);
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

  // Admin → edit: reopen the drag-and-drop builder pre-filled with the current
  // arrangement; saving writes back into this same konkláve (progress kept).
  if (editing && isAdmin) {
    return (
      <KonklaveBuilder
        mode="edit"
        konklaveId={konklaveId}
        initialBoxes={buildInitialBoxes(konklave.placements)}
        rooms={rooms}
        players={inGamePlayers}
        organizers={users}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // Live meter counts, recomputed from the lifted check state so a toggle here,
  // on the home section, or by another organizer updates both meters at once.
  const total = konklave.placements.length;
  const checksOf = (id: string, p: Checks) => checkByPlacement[id] ?? p;
  const nRoom = konklave.placements.filter(
    (p) => checksOf(p.id, p).wentToRoom,
  ).length;
  const nBack = konklave.placements.filter(
    (p) => checksOf(p.id, p).cameBack,
  ).length;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  // Group placements by organizer (first-appearance order); null-organizer
  // placements collect into a final "Bez doprovodu" card.
  const groups: { key: string; title: string; placements: PlacementRow[] }[] =
    [];
  const groupByKey = new Map<string, (typeof groups)[number]>();
  const noOrg: PlacementRow[] = [];
  for (const p of konklave.placements) {
    if (!p.organizerProfileId) {
      noOrg.push(p);
      continue;
    }
    const existing = groupByKey.get(p.organizerProfileId);
    if (existing) {
      existing.placements.push(p);
    } else {
      const g = {
        key: p.organizerProfileId,
        title: p.organizer ? userLabel(p.organizer) : "Organizátor",
        placements: [p],
      };
      groupByKey.set(p.organizerProfileId, g);
      groups.push(g);
    }
  }

  // Rooms not used by any placement in this konkláve — the all-rooms prop minus
  // every roomId that appears on a placement. Shown read-only as a reminder of
  // which rooms are still free.
  const assignedRoomIds = new Set(
    konklave.placements.map((p) => p.roomId).filter((id): id is string => !!id),
  );
  const freeRooms = rooms.filter((r) => !assignedRoomIds.has(r.id));

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

      {/* Doprovod cards grouped by organizer, read-only for assignment. */}
      <div className="flex flex-col gap-3.5">
        {groups.map((g) => (
          <DoprovodCard key={g.key} title={g.title} hasOrganizer>
            {g.placements.map((p) => {
              const checks = checkByPlacement[p.id] ?? {
                wentToRoom: p.wentToRoom,
                cameBack: p.cameBack,
              };
              return (
                <DoprovodLine
                  key={p.id}
                  placement={p}
                  seatNumber={seatByPlayer[p.player.id] ?? null}
                  wentToRoom={checks.wentToRoom}
                  cameBack={checks.cameBack}
                  onToggle={changeCheck}
                />
              );
            })}
          </DoprovodCard>
        ))}
        {noOrg.length > 0 ? (
          <DoprovodCard title="Bez doprovodu" hasOrganizer={false}>
            {noOrg.map((p) => {
              const checks = checkByPlacement[p.id] ?? {
                wentToRoom: p.wentToRoom,
                cameBack: p.cameBack,
              };
              return (
                <DoprovodLine
                  key={p.id}
                  placement={p}
                  seatNumber={seatByPlayer[p.player.id] ?? null}
                  wentToRoom={checks.wentToRoom}
                  cameBack={checks.cameBack}
                  onToggle={changeCheck}
                />
              );
            })}
          </DoprovodCard>
        ) : null}

        {/* Rooms not assigned to any placement in this konkláve (read-only). */}
        <div className="rounded-[14px] border border-[var(--line-strong)] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] p-3 pb-2.5">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="font-display min-w-0 flex-1 truncate text-[17px] font-semibold">
              Volné místnosti
            </span>
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {freeRooms.length}
            </span>
          </div>
          {freeRooms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {freeRooms.map((r) => (
                <div
                  key={r.id}
                  className="flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2.5 py-1.5"
                >
                  <RoomIcon className="size-6 rounded-[7px] text-[13px]" />
                  <span className="font-display truncate text-[15px] font-semibold">
                    {r.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground px-1 py-2 text-center text-xs italic">
              — žádné volné místnosti —
            </div>
          )}
        </div>
      </div>

      {isAdmin ? (
        <div className="flex flex-col gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            Upravit rozmístění
          </Button>
          <FinishKonklaveDialog konklaveId={konklaveId} />
        </div>
      ) : null}
    </Card>
  );
}
