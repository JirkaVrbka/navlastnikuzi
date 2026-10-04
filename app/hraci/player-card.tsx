"use client";

import { Card } from "@/components/ui/card";
import type { PlayerWithNotes } from "@/lib/db/players";
import { publicPhotoUrl } from "@/lib/photos";
import { PlayerDialog } from "./player-dialog";
import { reasonLabel, initials } from "./labels";

// One player as a card: photo (or initials), name, nickname, status badge,
// drop-out order #N + reason when out, and the notes list. The header is the
// trigger that opens the detail dialog (view → edit). Only phrasing content
// goes inside the trigger <button>; the notes list sits outside it.
export function PlayerCard({
  player,
  dropoutOrder,
}: {
  player: PlayerWithNotes;
  dropoutOrder?: number;
}) {
  return (
    <Card className="gap-0 p-4">
      <PlayerDialog
        player={player}
        dropoutOrder={dropoutOrder}
        triggerClassName="hover:bg-muted -m-2 flex items-center gap-3 rounded-lg p-2 text-left"
      >
        {player.picturePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicPhotoUrl(player.picturePath)}
            alt={player.name}
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-medium">
            {initials(player.name) || "?"}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{player.name}</span>
          {player.nickname ? (
            <span className="text-muted-foreground truncate text-sm">
              {`„${player.nickname}"`}
            </span>
          ) : null}
        </span>
      </PlayerDialog>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {player.inGame ? (
          <span className="rounded-full border border-emerald-600/40 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Ve hře
          </span>
        ) : (
          <>
            <span className="border-destructive/40 text-destructive rounded-full border px-2 py-0.5 text-xs font-medium">
              Vyřazen(a)
            </span>
            {dropoutOrder ? (
              <span className="text-muted-foreground text-xs">
                pořadí #{dropoutOrder}
              </span>
            ) : null}
            {player.reason ? (
              <span className="text-muted-foreground text-xs">
                · {reasonLabel(player.reason)}
              </span>
            ) : null}
          </>
        )}
      </div>

      {player.notes.length > 0 ? (
        <ul className="text-muted-foreground mt-2 flex list-disc flex-col gap-0.5 pl-4 text-sm">
          {player.notes.map((n) => (
            <li key={n.id} className="whitespace-pre-wrap">
              {n.content}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
