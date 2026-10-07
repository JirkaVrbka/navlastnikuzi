"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Check, DoorOpen } from "lucide-react";
import type {
  PlacementRow as PlacementRowData,
  RoomRow,
} from "@/lib/db/konklave";
import type { PickableUser } from "@/lib/db/itinerary";
import { userLabel } from "@/app/itinerar/organizer-picker";
import { CandidateAvatar } from "@/app/hlasovani/candidate-avatar";
import { updatePlacement } from "./actions";

// Themed dark <select>, shared look with end-voting-dialog / the old row.
const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-[var(--panel-2)] px-3 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const captionClass =
  "text-muted-foreground text-[10px] tracking-[0.12em] uppercase";

// One umístění (placement) as a compact card: a tappable summary line (avatar +
// name + room/organizer meta) with two toggle buttons ("V pokoji" / "Zpět"), and
// an expandable edit drawer holding the room + organizer selects. Room state and
// the two checks are owned by the parent (ActiveKonklave) — room so availability
// stays consistent across rows, the checks so Realtime keeps them in sync with
// the home section; both toggle optimistically in the parent and revert with a
// Czech message if the server rejects the change. "Zpět" depends on "V pokoji"
// (server-enforced in setPlacementCheckCore); the button is disabled until the
// player is in the room. The organizer select still toggles optimistically here.
export function PlacementRow({
  placement,
  currentRoomId,
  availableRooms,
  users,
  wentToRoom,
  cameBack,
  onChangeRoom,
  onToggleCheck,
}: {
  placement: PlacementRowData;
  currentRoomId: string | null;
  availableRooms: RoomRow[];
  users: PickableUser[];
  wentToRoom: boolean;
  cameBack: boolean;
  onChangeRoom: (placementId: string, roomId: string | null) => Promise<string>;
  onToggleCheck: (
    placementId: string,
    field: "wentToRoom" | "cameBack",
    value: boolean,
  ) => Promise<string>;
}) {
  const [organizerId, setOrganizerId] = useState<string | null>(
    placement.organizerProfileId,
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const name = placement.player.name;
  const nick = placement.player.nickname?.trim() || "";
  const roomName =
    availableRooms.find((r) => r.id === currentRoomId)?.name ?? null;
  const organizerName =
    users.find((u) => u.id === organizerId) != null
      ? userLabel(users.find((u) => u.id === organizerId)!)
      : null;

  function handleRoomChange(value: string) {
    setError("");
    void onChangeRoom(placement.id, value || null).then((err) => {
      if (err) setError(err);
    });
  }

  function handleOrganizerChange(value: string) {
    setError("");
    const next = value || null;
    const prev = organizerId;
    setOrganizerId(next);
    startTransition(async () => {
      const res = await updatePlacement(placement.id, {
        organizerProfileId: next,
      });
      if (res.error) {
        setOrganizerId(prev);
        setError(res.error);
      }
    });
  }

  function toggleCheck(field: "wentToRoom" | "cameBack", next: boolean) {
    setError("");
    void onToggleCheck(placement.id, field, next).then((err) => {
      if (err) setError(err);
    });
  }

  // Left-spine color reflects progress: muted → in room (gold) → back (green + glow).
  const spine = cameBack
    ? "border-l-green shadow-[0_0_14px_-6px_rgba(127,174,118,0.5)]"
    : wentToRoom
      ? "border-l-gold"
      : "border-l-[var(--line-strong)]";

  const toggleBase =
    "flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1 text-[10px] tracking-[0.06em] uppercase transition-all active:scale-95";
  const toggleOff =
    "border-[var(--line-strong)] bg-[var(--panel-2)] text-muted-foreground";

  return (
    <li
      className={`border-border flex flex-col rounded-lg border border-l-[3px] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] px-2.5 py-2 transition-[border-color,box-shadow] ${spine}`}
    >
      <div className="flex items-center gap-3">
        {/* Tappable summary — reveals the edit drawer. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <CandidateAvatar
            name={placement.player.name}
            nickname={placement.player.nickname}
            picturePath={placement.player.picturePath}
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
            <span className="mt-1 flex flex-col gap-px">
              <span className="truncate text-[11px] leading-tight">
                <span className={`${captionClass} mr-1.5`}>Místnost</span>
                {roomName ? (
                  <span className="text-gold font-medium">{roomName}</span>
                ) : (
                  <span className="text-muted-foreground italic">
                    bez místnosti
                  </span>
                )}
              </span>
              <span className="truncate text-[11px] leading-tight">
                <span className={`${captionClass} mr-1.5`}>Organizátor</span>
                {organizerName ? (
                  <span className="text-muted-foreground">{organizerName}</span>
                ) : (
                  <span className="text-muted-foreground italic">
                    bez organizátora
                  </span>
                )}
              </span>
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={`text-muted-foreground size-4 shrink-0 transition-transform ${
              open ? "text-gold rotate-180" : ""
            }`}
          />
        </button>

        {/* Two checks. */}
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-pressed={wentToRoom}
            onClick={() => toggleCheck("wentToRoom", !wentToRoom)}
            className={`${toggleBase} ${
              wentToRoom ? "bg-gold/15 border-gold text-gold-bright" : toggleOff
            }`}
          >
            <DoorOpen aria-hidden className="size-4" />V pokoji
          </button>
          <button
            type="button"
            aria-pressed={cameBack}
            disabled={!wentToRoom}
            onClick={() => toggleCheck("cameBack", !cameBack)}
            className={`${toggleBase} ${
              cameBack ? "bg-green-bg border-green text-green" : toggleOff
            } disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <Check aria-hidden className="size-4" />
            Zpět
          </button>
        </div>
      </div>

      {/* Edit drawer: room + organizer assignment. */}
      {open ? (
        <div className="border-border mt-2.5 flex flex-col gap-2.5 border-t pt-2.5">
          <label className="flex flex-col gap-1">
            <span className={captionClass}>Místnost</span>
            <select
              aria-label={`Místnost — ${name}`}
              className={selectClass}
              value={currentRoomId ?? ""}
              onChange={(e) => handleRoomChange(e.target.value)}
            >
              <option value="">— bez místnosti —</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={captionClass}>Organizátor</span>
            <select
              aria-label={`Organizátor — ${name}`}
              className={selectClass}
              value={organizerId ?? ""}
              onChange={(e) => handleOrganizerChange(e.target.value)}
            >
              <option value="">— bez organizátora —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="text-red mt-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
