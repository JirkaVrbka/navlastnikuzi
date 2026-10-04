"use client";

import { buttonVariants } from "@/components/ui/button";
import type { PlayerWithNotes } from "@/lib/db/players";
import { computeDropoutOrder } from "@/lib/domain/players";
import { PlayerCard } from "./player-card";
import { PlayerDialog } from "./player-dialog";

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
    <div className="flex flex-col gap-4">
      <PlayerDialog
        triggerClassName={
          buttonVariants({ variant: "outline", size: "sm" }) + " self-start"
        }
      >
        + Přidat hráče
      </PlayerDialog>

      {players.length === 0 ? (
        <p className="text-muted-foreground">
          Zatím žádní hráči. Přidejte prvního výše.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} dropoutOrder={order.get(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
