"use client";

import { cn } from "cn";
import { PlayerPhoto } from "@/components/player-photo";

export interface SeatSlotData {
  seatNumber: number;
  playerName: string | null; // null = empty seat
  picturePath: string | null;
  inGame: boolean | null; // false = dead (greyed); null when empty
}

// One seat on the board: a gold seat-number badge, the player's avatar, and their
// name. Empty = dashed placeholder. Dead (inGame === false) = greyed + struck
// name. In edit mode the whole tile is a ≥44px button; in view mode it is static
// (the avatar keeps its own photo lightbox via PlayerPhoto's interactive mode).
export function SeatSlot({
  seat,
  editMode,
  swapSource,
  onActivate,
}: {
  seat: SeatSlotData;
  editMode: boolean;
  swapSource: boolean;
  onActivate: (seatNumber: number) => void;
}) {
  const empty = seat.playerName === null;
  const dead = seat.inGame === false;
  const name = seat.playerName ?? "";

  const body = (
    <>
      <span className="text-gold font-display absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--panel-2)] text-[11px] tabular-nums">
        {seat.seatNumber}
      </span>
      {empty ? (
        <span className="text-gold flex size-10 items-center justify-center rounded-full border border-dashed border-[var(--line-strong)] text-lg">
          +
        </span>
      ) : (
        <PlayerPhoto
          picturePath={seat.picturePath}
          name={name}
          sizeClass="size-10"
          eliminated={dead}
          interactive={!editMode}
        />
      )}
      <span
        className={cn(
          "mt-1 w-full truncate text-center text-[11px]",
          dead ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {empty ? "—" : name}
      </span>
    </>
  );

  const base = "relative flex w-16 shrink-0 flex-col items-center";

  if (!editMode) {
    return <div className={base}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onActivate(seat.seatNumber)}
      aria-label={
        empty
          ? `Sedadlo ${seat.seatNumber} — prázdné`
          : `Sedadlo ${seat.seatNumber} — ${name}${dead ? " (vyřazen)" : ""}`
      }
      className={cn(
        base,
        "min-h-[44px] rounded-xl p-1 transition-colors",
        swapSource
          ? "bg-accent/20 ring-gold ring-2"
          : "hover:bg-muted cursor-pointer",
      )}
    >
      {body}
    </button>
  );
}
