"use client";

import { useMemo, useState } from "react";
import type { PlayerWithNotes } from "@/lib/db/players";
import { computeDropoutOrder } from "@/lib/domain/players";
import { PlayerCard } from "./player-card";
import { PlayerDialog } from "./player-dialog";
import { addButtonClass } from "@/lib/ui";
import { Input } from "@/components/ui/input";

// Accent- and case-insensitive normalization so "reznik" matches "Řezník".
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// Client board: derives each player's drop-out order and renders the add-player
// dialog plus a card per player.
export function PlayersBoard({
  players,
  isAdmin = false,
}: {
  players: PlayerWithNotes[];
  isAdmin?: boolean;
}) {
  const order = computeDropoutOrder(
    players.map((p) => ({
      id: p.id,
      inGame: p.inGame,
      eliminatedAt: p.eliminatedAt,
    })),
  );

  // Display order: active players first, then eliminated ones below, the latter
  // in drop-out order (#1 first). Array.sort is stable, so active players keep
  // their incoming (server) order. `order` is derived from ALL players above.
  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.inGame !== b.inGame) return a.inGame ? -1 : 1;
        if (!a.inGame && !b.inGame)
          return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
        return 0;
      }),
    [players, order],
  );

  const [query, setQuery] = useState("");
  // Filter by name, nickname and any note (accent/case-insensitive). Drop-out
  // order above is derived from ALL players, so filtering only hides cards.
  const shown = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return sorted;
    return sorted.filter((p) =>
      norm(
        [p.name, p.nickname ?? "", ...p.notes.map((n) => n.content)].join(" "),
      ).includes(q),
    );
  }, [sorted, query]);

  return (
    <div className="flex flex-col gap-[14px]">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Hledat hráče"
        placeholder="Hledat jméno, přezdívku, poznámku…"
      />

      {isAdmin && (
        <PlayerDialog triggerClassName={addButtonClass}>
          + Přidat hráče
        </PlayerDialog>
      )}

      {players.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm italic">
          Zatím žádní hráči. Přidejte prvního výše.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm italic">
          Nic nenalezeno.
        </p>
      ) : (
        shown.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            dropoutOrder={order.get(p.id)}
            isAdmin={isAdmin}
          />
        ))
      )}
    </div>
  );
}
