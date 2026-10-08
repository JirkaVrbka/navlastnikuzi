"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

export type ArchivedPlacementView = {
  id: string;
  playerName: string;
  side: "a" | "b";
  done: boolean;
  note: string | null;
};

export type ArchivedConfessionView = {
  id: string;
  finishedAt: Date | string | null;
  placements: ArchivedPlacementView[];
};

function formatFinished(finishedAt: Date | string | null): string {
  if (!finishedAt) return "";
  const d = finishedAt instanceof Date ? finishedAt : new Date(finishedAt);
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

// One archived column: its players, each with ✓/✗ for "Hotovo" and the note.
function Column({
  label,
  placements,
}: {
  label: string;
  placements: ArchivedPlacementView[];
}) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-[10px] tracking-[0.12em] uppercase">
        {label} ({placements.length})
      </div>
      <ul className="mt-1 flex flex-col gap-1">
        {placements.length === 0 ? (
          <li className="text-muted-foreground text-[11px] italic">Prázdné</li>
        ) : (
          placements.map((p) => (
            <li key={p.id} className="text-[13px]">
              <span className="flex items-baseline gap-1.5">
                <span
                  className={p.done ? "text-green" : "text-muted-foreground"}
                >
                  <span aria-hidden>{p.done ? "✓" : "✗"}</span>
                  <span className="sr-only">
                    {p.done ? "Hotovo" : "Nehotovo"}
                  </span>
                </span>
                <span className="font-display min-w-0 truncate font-semibold">
                  {p.playerName}
                </span>
              </span>
              {p.note ? (
                <span className="text-muted-foreground mt-0.5 block text-[11px] italic">
                  {p.note}
                </span>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// Read-only history of archived zpovědi in a collapsible card: each one shows when
// it finished and, per column, its players with ✓/✗ of "Hotovo" and any note.
// Mirrors the konkláve / voting history.
export function ConfessionHistory({
  confessions,
}: {
  confessions: ArchivedConfessionView[];
}) {
  const [open, setOpen] = useState(false);
  if (confessions.length === 0) return null;

  return (
    <Card className="mt-4 gap-0 p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground flex min-h-11 w-full items-center justify-between py-1.5 text-[11px] tracking-[0.2em] uppercase"
      >
        <span>Historie zpovědí</span>
        <span
          aria-hidden
          className={cn("text-gold transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="mt-1 flex flex-col gap-2">
          {confessions.map((c) => (
            <div
              key={c.id}
              className="border-border rounded-xl border bg-[var(--charcoal)] px-3.5 py-3"
            >
              <div className="text-muted-foreground font-sans text-[11px] tracking-[0.1em] uppercase">
                {formatFinished(c.finishedAt)}
              </div>
              <div className="mt-2 grid grid-cols-2 items-start gap-3">
                <Column
                  label="Sloupec A"
                  placements={c.placements.filter((p) => p.side === "a")}
                />
                <Column
                  label="Sloupec B"
                  placements={c.placements.filter((p) => p.side === "b")}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
