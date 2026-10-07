"use client";

import { useState, useTransition } from "react";
import type {
  PlacementRow as PlacementRowData,
  RoomRow,
} from "@/lib/db/konklave";
import type { PickableUser } from "@/lib/db/itinerary";
import { userLabel } from "@/app/itinerar/organizer-picker";
import { CandidateAvatar } from "@/app/hlasovani/candidate-avatar";
import { updatePlacement } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";

const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-[var(--panel-2)] px-3 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const captionClass =
  "text-muted-foreground text-[11px] tracking-[0.12em] uppercase";

// One umístění (placement): avatar + player name, a room <select>, an organizer
// <select>, and two checkboxes ("V místnosti" / "Zpět u stolu"). Room state and
// the two checks are owned by the parent (ActiveKonklave) — room so availability
// stays consistent across rows, and the checks so Realtime keeps them in sync
// with the home section; both toggle optimistically in the parent and revert
// with a Czech message if the server rejects the change. The organizer select
// still toggles optimistically here.
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
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const displayName =
    placement.player.nickname?.trim() || placement.player.name;

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

  const wentId = `went-${placement.id}`;
  const backId = `back-${placement.id}`;

  return (
    <li className="border-border flex min-h-[44px] flex-col gap-3 border-t py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        <CandidateAvatar
          name={placement.player.name}
          nickname={placement.player.nickname}
          picturePath={placement.player.picturePath}
        />
        <div className="font-display min-w-0 flex-1 truncate text-[19px] leading-tight font-semibold">
          {displayName}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1">
          <span className={captionClass}>Místnost</span>
          <select
            aria-label={`Místnost — ${displayName}`}
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
            aria-label={`Organizátor — ${displayName}`}
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

        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex min-h-[44px] items-center gap-2.5">
            <Checkbox
              id={wentId}
              className="size-5"
              checked={wentToRoom}
              onCheckedChange={(value) => toggleCheck("wentToRoom", value)}
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
              checked={cameBack}
              onCheckedChange={(value) => toggleCheck("cameBack", value)}
            />
            <label
              htmlFor={backId}
              className="cursor-pointer text-[15px] select-none"
            >
              Zpět u stolu
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-red text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
