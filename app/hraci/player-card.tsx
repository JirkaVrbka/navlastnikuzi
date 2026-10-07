"use client";

import { Card } from "@/components/ui/card";
import type { PlayerWithNotes } from "@/lib/db/players";
import { PlayerPhoto } from "@/components/player-photo";
import { PlayerDialog } from "./player-dialog";
import { reasonLabel } from "./labels";

// One player as a cinematic single-column card: radial-gradient avatar (photo if
// present, else up-to-2-letter initials / "?"), name + „nickname", the inline
// status pill (green Ve hře / red Vyřazen(a) + "pořadí #N · {reason}"), and notes
// as the oxblood-bulleted list. The header row is the trigger that opens the
// detail dialog (view → edit); only non-interactive content lives inside it, so
// the notes list sits outside the <button>.
export function PlayerCard({
  player,
  dropoutOrder,
}: {
  player: PlayerWithNotes;
  dropoutOrder?: number;
}) {
  const out = !player.inGame;

  // Eliminated meta line: "pořadí #N · {reason}" (each part only when present).
  const metaParts: string[] = [];
  if (dropoutOrder) metaParts.push(`pořadí #${dropoutOrder}`);
  if (player.reason) metaParts.push(reasonLabel(player.reason));
  const meta = metaParts.join(" · ");

  return (
    <Card className="gap-0 p-4">
      <div className="flex items-start gap-[14px]">
        {/* Photo is its own button (opens the enlarge lightbox) — kept OUTSIDE
            the dialog trigger so the two taps don't nest/conflict. */}
        <PlayerPhoto
          picturePath={player.picturePath}
          name={player.name}
          sizeClass="size-12"
          initialsTextClass="text-[18px]"
          eliminated={out}
        />

        <PlayerDialog
          player={player}
          dropoutOrder={dropoutOrder}
          triggerClassName="-m-1 flex min-w-0 flex-1 flex-col items-start rounded-[var(--radius)] p-1 text-left transition-colors hover:bg-[rgba(201,162,100,0.05)]"
        >
          <span className="leading-tight">
            <span className="font-display text-[20px] leading-tight font-semibold">
              {player.name}
            </span>
            {player.nickname ? (
              <span className="text-gold ml-1.5 text-[13px] italic">
                {`„${player.nickname}"`}
              </span>
            ) : null}
          </span>

          {out ? (
            <>
              <span className="border-red/40 bg-red-bg text-red mt-1.5 inline-block w-fit rounded-full border px-[11px] py-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
                Vyřazen(a)
              </span>
              {meta ? (
                <span className="text-muted-foreground mt-1.5 text-xs tracking-[0.02em]">
                  {meta}
                </span>
              ) : null}
            </>
          ) : (
            <span className="border-green/40 bg-green-bg text-green mt-1.5 inline-block w-fit rounded-full border px-[11px] py-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Ve hře
            </span>
          )}
        </PlayerDialog>
      </div>

      {player.notes.length > 0 ? (
        <ul className="mt-2.5 list-none pl-[62px]">
          {player.notes.map((n) => (
            <li
              key={n.id}
              className="text-muted-foreground relative mb-[3px] pl-4 text-[13px] whitespace-pre-wrap"
            >
              <span
                aria-hidden
                className="text-oxblood-soft absolute top-0 left-0.5"
              >
                ◦
              </span>
              {n.content}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
