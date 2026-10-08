"use client";

import { useState, useTransition } from "react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleEventItem } from "./actions";

type ChecklistItem = {
  id: string;
  content: string;
  checked: boolean;
  // Whether this item is backed by a catalog prop (Rekvizity). A false value
  // earns a small red "není v katalogu" chip — a nudge to add it to the catalog.
  inCatalog: boolean;
};

// Persisted "Rekvizity" checklist inside the read-only event view. Items keep
// their given order (ticking never reorders them). Each toggle flips local state
// optimistically, then persists via the server action; on failure it reverts.
export function ItemChecklist({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.checked])),
  );
  const [, startTransition] = useTransition();

  function toggle(id: string, next: boolean) {
    setChecked((prev) => ({ ...prev, [id]: next }));
    startTransition(async () => {
      try {
        await toggleEventItem(id, next);
      } catch {
        // Revert the optimistic flip if persisting failed.
        setChecked((prev) => ({ ...prev, [id]: !next }));
      }
    });
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((i) => {
        const isChecked = checked[i.id] ?? false;
        const inputId = `item-${i.id}`;
        return (
          <li key={i.id} className="flex min-h-[44px] items-center gap-3">
            <Checkbox
              id={inputId}
              className="size-5"
              checked={isChecked}
              onCheckedChange={(value) => toggle(i.id, value)}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label
                htmlFor={inputId}
                className={cn(
                  "cursor-pointer text-[15px] select-none",
                  isChecked && "text-muted-foreground line-through",
                )}
              >
                {i.content}
              </label>
              {!i.inCatalog ? (
                <span
                  title="Rekvizita není v katalogu"
                  className="border-red/40 bg-red-bg text-red shrink-0 rounded-full border px-[9px] py-0.5 text-[11px] font-semibold tracking-[0.12em] uppercase"
                >
                  není v katalogu
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
