"use client";

import type { ConfessionPlacementRow } from "@/lib/db/confession";
import type { Side } from "@/lib/validation/confession";
import { PlacementRow } from "./placement-row";

// One column of the zpověď: a header (label + live count) and its player rows.
// The parent (ActiveConfession) owns all mutable row state (side, done, note),
// so this just forwards the current values + handlers down to each row.
export function ConfessionColumn({
  label,
  count,
  side,
  placements,
  doneByPlacement,
  noteByPlacement,
  onMove,
  onToggleDone,
  onChangeNote,
  onSaveNote,
}: {
  label: string;
  count: number;
  side: Side;
  placements: ConfessionPlacementRow[];
  doneByPlacement: Record<string, boolean>;
  noteByPlacement: Record<string, string>;
  onMove: (placementId: string) => Promise<string>;
  onToggleDone: (placementId: string, next: boolean) => Promise<string>;
  onChangeNote: (placementId: string, value: string) => void;
  onSaveNote: (placementId: string) => Promise<string>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="border-border flex items-baseline justify-between gap-1 border-b pb-1">
        <span className="text-muted-foreground truncate text-[10px] tracking-[0.12em] uppercase">
          {label}
        </span>
        <span className="font-display text-gold text-sm font-semibold tabular-nums">
          {count}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {placements.map((p) => (
          <PlacementRow
            key={p.id}
            placement={p}
            side={side}
            done={doneByPlacement[p.id] ?? p.done}
            note={noteByPlacement[p.id] ?? ""}
            onMove={onMove}
            onToggleDone={onToggleDone}
            onChangeNote={onChangeNote}
            onSaveNote={onSaveNote}
          />
        ))}
        {placements.length === 0 ? (
          <li className="text-muted-foreground px-1 py-2 text-[11px] italic">
            Prázdné
          </li>
        ) : null}
      </ul>
    </div>
  );
}
