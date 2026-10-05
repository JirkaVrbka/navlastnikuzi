"use client";

import { useState, useTransition } from "react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleEventItem } from "./actions";

type ChecklistItem = { id: string; content: string; checked: boolean };

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
          <li key={i.id} className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={isChecked}
              onCheckedChange={(value) => toggle(i.id, value)}
            />
            <label
              htmlFor={inputId}
              className={cn(
                "cursor-pointer select-none",
                isChecked && "text-muted-foreground line-through",
              )}
            >
              {i.content}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
