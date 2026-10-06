"use client";

import type { PlayerWithNotes } from "@/lib/db/players";
import { computeDropoutOrder } from "@/lib/domain/players";
import { PlayerCard } from "./player-card";
import { PlayerDialog } from "./player-dialog";
import { addButtonClass } from "@/lib/ui";

// Client board: derives each player's drop-out order and renders the add-player
// dialog plus a card per player.
export function PlayersBoard({ players }: { players: PlayerWithNotes[] }) {
  const order = computeDropoutOrder(
    players.map((p) => ({
      id: p.id,
      inGame: p.inGame,
      eliminatedAt: p.eliminatedAt,
    })),
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <PlayerDialog triggerClassName={addButtonClass}>
        + Přidat hráče
      </PlayerDialog>

      {players.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm italic">
          Zatím žádní hráči. Přidejte prvního výše.
        </p>
      ) : (
        players.map((p) => (
          <PlayerCard key={p.id} player={p} dropoutOrder={order.get(p.id)} />
        ))
      )}
    </div>
  );
}
