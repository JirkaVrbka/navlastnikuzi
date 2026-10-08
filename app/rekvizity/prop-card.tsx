"use client";

import { Card } from "@/components/ui/card";
import type { Prop } from "@/lib/db/schema";
import { PropDialog } from "./prop-dialog";

// One catalog prop as a cinematic single-column card: serif name, the owned
// count (gold tabular) with a "ks" caption, the Máme/Nemáme status pill (same
// green/red tokens as the players board), and an optional note. The header is
// the trigger that opens the detail dialog (view → edit); the note sits outside
// the <button> so only non-interactive content lives inside it.
export function PropCard({ prop }: { prop: Prop }) {
  return (
    <Card className="gap-0 p-4">
      <PropDialog
        prop={prop}
        triggerClassName="-m-1 flex min-w-0 flex-col items-start rounded-[var(--radius)] p-1 text-left transition-colors hover:bg-[rgba(201,162,100,0.05)]"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="font-display text-[20px] leading-tight font-semibold">
            {prop.name}
          </span>
          <span className="shrink-0 leading-tight whitespace-nowrap">
            <span className="text-gold font-display text-[20px] font-semibold tabular-nums">
              {prop.count}
            </span>
            <span className="text-muted-foreground ml-1 text-[11px] tracking-[0.12em] uppercase">
              ks
            </span>
          </span>
        </span>

        {prop.haveIt ? (
          <span className="border-green/40 bg-green-bg text-green mt-1.5 inline-block w-fit rounded-full border px-[11px] py-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Máme
          </span>
        ) : (
          <span className="border-red/40 bg-red-bg text-red mt-1.5 inline-block w-fit rounded-full border px-[11px] py-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Nemáme
          </span>
        )}
      </PropDialog>

      {prop.note ? (
        <p className="text-muted-foreground mt-2.5 text-[13px] whitespace-pre-wrap">
          {prop.note}
        </p>
      ) : null}
    </Card>
  );
}
