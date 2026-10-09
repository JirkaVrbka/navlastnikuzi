"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlayerPhoto } from "@/components/player-photo";
import type { UnseatedPlayer } from "@/lib/db/table-seats";

// Searchable list of unseated players. Picking one calls onPick(playerId); the
// parent closes the dialog and runs the assign action.
export function PlayerPicker({
  open,
  players,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  players: UnseatedPlayer[];
  onOpenChange: (open: boolean) => void;
  onPick: (playerId: string) => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.nickname?.toLowerCase().includes(needle) ?? false),
      )
    : players;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,420px)]">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px]">
            Vyberte hráče
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Hledat…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-2 flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground p-2 text-sm">
              Žádní volní hráči.
            </p>
          ) : (
            filtered.map((p) => {
              const label = p.nickname?.trim() || p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p.id)}
                  className="hover:bg-muted flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors"
                >
                  <PlayerPhoto
                    picturePath={p.picturePath}
                    name={label}
                    sizeClass="size-8"
                    initialsTextClass="text-sm"
                    eliminated={p.inGame === false}
                    interactive={false}
                  />
                  <span className="truncate text-sm">{label}</span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
