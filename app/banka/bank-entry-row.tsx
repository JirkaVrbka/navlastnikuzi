"use client";

import { useState } from "react";
import type { BankEntryRow as BankEntryRowType } from "@/lib/db/bank";
import { formatKc } from "@/lib/domain/bank";
import { BankEntryDialog } from "./bank-entry-dialog";
import { DeleteEntryDialog } from "./delete-entry-dialog";
import { Card } from "@/components/ui/card";

const dateTimeFmt = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "short",
  timeStyle: "short",
});

// One ledger row: mission (serif), the zisk amount (gold, tabular, right), the
// creation-time caption, and — only when it differs — the potenciál underneath.
// Edit and delete controls (each ≥44px) drive the shared dialogs below.
export function BankEntryRow({ entry }: { entry: BankEntryRowType }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasExtraPotential = entry.potential !== entry.profit;

  return (
    <>
      <Card className="px-4">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display truncate text-[19px] leading-tight font-semibold">
              {entry.mission}
            </span>
            <span className="text-muted-foreground text-[11px] tracking-[0.08em] tabular-nums">
              {dateTimeFmt.format(new Date(entry.createdAt))}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-gold text-[17px] font-semibold tabular-nums">
              {formatKc(entry.profit)}
            </span>
            {hasExtraPotential ? (
              <span className="text-muted-foreground text-[12px] tabular-nums">
                z {formatKc(entry.potential)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label={`Upravit ${entry.mission}`}
              className="text-muted-foreground hover:text-gold-bright flex size-11 items-center justify-center rounded-lg text-[17px] transition-colors"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Smazat ${entry.mission}`}
              className="text-muted-foreground hover:text-destructive flex size-11 items-center justify-center rounded-lg text-[17px] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </Card>

      <BankEntryDialog
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteEntryDialog
        id={entry.id}
        mission={entry.mission}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
