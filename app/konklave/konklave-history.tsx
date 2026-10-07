"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

export type ArchivedPlacementView = {
  id: string;
  playerName: string;
  roomName: string | null;
  organizerName: string | null;
  wentToRoom: boolean;
  cameBack: boolean;
};

export type ArchivedKonklaveView = {
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

// Read-only history of archived konkláves in a collapsible card: each one shows
// when it finished and its placements (player → room, the organizer, and ✓/✗ for
// "V místnosti" and "Zpět u stolu"). Mirrors the voting history.
export function KonklaveHistory({
  konklaves,
}: {
  konklaves: ArchivedKonklaveView[];
}) {
  const [open, setOpen] = useState(false);
  if (konklaves.length === 0) return null;

  return (
    <Card className="mt-4 gap-0 p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground flex min-h-11 w-full items-center justify-between py-1.5 text-[11px] tracking-[0.2em] uppercase"
      >
        <span>Historie konkláve</span>
        <span
          aria-hidden
          className={cn("text-gold transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="mt-1 flex flex-col gap-2">
          {konklaves.map((k) => (
            <div
              key={k.id}
              className="border-border rounded-xl border bg-[var(--charcoal)] px-3.5 py-3"
            >
              <div className="text-muted-foreground font-sans text-[11px] tracking-[0.1em] uppercase">
                {formatFinished(k.finishedAt)}
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {k.placements.map((p) => (
                  <li key={p.id} className="text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="font-display text-[16px] font-semibold">
                        {p.playerName}
                      </span>
                      <span className="text-muted-foreground" aria-hidden>
                        →
                      </span>
                      <span className="text-gold">
                        {p.roomName ?? "bez místnosti"}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                      <span>{p.organizerName ?? "bez organizátora"}</span>
                      <span className="tabular-nums">
                        V místnosti: {p.wentToRoom ? "✓" : "✗"} · Zpět u stolu:{" "}
                        {p.cameBack ? "✓" : "✗"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
