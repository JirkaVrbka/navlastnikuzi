"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { boardSlots, HEAD_LABEL } from "@/lib/domain/table";
import { SeatSlot, type SeatSlotData } from "./seat-slot";
import { PlayerPicker } from "./player-picker";
import { assignSeat, clearSeat, swapSeats } from "./actions";
import type { TableSeatRow, UnseatedPlayer } from "@/lib/db/table-seats";

export function TableBoard({
  seats,
  unseatedPlayers,
  isAdmin,
}: {
  seats: TableSeatRow[];
  unseatedPlayers: UnseatedPlayer[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [pickerSeat, setPickerSeat] = useState<number | null>(null);
  const [menuSeat, setMenuSeat] = useState<number | null>(null);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const bySeat = new Map<number, SeatSlotData>();
  for (const s of seats) {
    bySeat.set(s.seatNumber, {
      seatNumber: s.seatNumber,
      // Nickname-first, matching the picker and the rest of the app; falls back
      // to the full name, and stays null for an empty seat.
      playerName: s.playerNickname?.trim() || s.playerName,
      picturePath: s.picturePath,
      inGame: s.inGame,
    });
  }
  const slot = (n: number): SeatSlotData =>
    bySeat.get(n) ?? {
      seatNumber: n,
      playerName: null,
      picturePath: null,
      inGame: null,
    };

  async function run(fn: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError("");
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh(); // re-fetch the server component (save + refresh model)
  }

  function onActivate(seatNumber: number) {
    if (busy) return;
    // A swap is in progress → this tap picks the second seat.
    if (swapSource !== null) {
      const a = swapSource;
      setSwapSource(null);
      if (a !== seatNumber)
        void run(() => swapSeats({ seatA: a, seatB: seatNumber }));
      return;
    }
    const s = slot(seatNumber);
    if (s.playerName === null) {
      setPickerSeat(seatNumber); // empty → assign straight away
    } else {
      setMenuSeat(seatNumber); // filled → action menu
    }
  }

  const slots = boardSlots();
  const renderEdge = (nums: number[]) =>
    nums.map((n) => (
      <SeatSlot
        key={n}
        seat={slot(n)}
        editMode={editMode}
        swapSource={swapSource === n}
        onActivate={onActivate}
      />
    ));

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Rectangle: long edges as the two vertical columns of 6, short edges
          top and bottom (4 each). The "Bar" head label sits under the bottom row. */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex justify-center gap-2">{renderEdge(slots.top)}</div>
        <div className="flex w-full items-stretch justify-between gap-2">
          <div className="flex flex-col gap-3">{renderEdge(slots.left)}</div>
          <div
            aria-hidden
            className="my-1 flex-1 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)]/40"
          />
          <div className="flex flex-col gap-3">{renderEdge(slots.right)}</div>
        </div>
        <div className="flex justify-center gap-2">
          {renderEdge(slots.bottom)}
        </div>
        <span className="text-muted-foreground text-[11px] tracking-[0.16em] uppercase">
          {HEAD_LABEL}
        </span>
      </div>

      {isAdmin && (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => {
              setEditMode((v) => !v);
              setSwapSource(null);
              setError("");
            }}
          >
            {editMode ? "Hotovo" : "Upravit"}
          </Button>
          {swapSource !== null && (
            <span className="text-gold text-xs tracking-[0.1em] uppercase">
              Vyberte druhé sedadlo
            </span>
          )}
        </div>
      )}

      <PlayerPicker
        open={pickerSeat !== null}
        players={unseatedPlayers}
        onOpenChange={(o) => {
          if (!o) setPickerSeat(null);
        }}
        onPick={(playerId) => {
          const seatNumber = pickerSeat;
          setPickerSeat(null);
          if (seatNumber !== null)
            void run(() => assignSeat({ seatNumber, playerId }));
        }}
      />

      {/* Filled-seat action menu */}
      <Dialog
        open={menuSeat !== null}
        onOpenChange={(o) => {
          if (!o) setMenuSeat(null);
        }}
      >
        <DialogContent className="max-w-[min(92vw,360px)]">
          <DialogHeader>
            <DialogTitle className="font-display text-[19px]">
              Sedadlo {menuSeat}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const s = menuSeat;
                setMenuSeat(null);
                setPickerSeat(s);
              }}
            >
              Změnit hráče
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const s = menuSeat;
                setMenuSeat(null);
                if (s !== null) setSwapSource(s);
              }}
            >
              Prohodit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const s = menuSeat;
                setMenuSeat(null);
                if (s !== null) void run(() => clearSeat({ seatNumber: s }));
              }}
            >
              Vyprázdnit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
