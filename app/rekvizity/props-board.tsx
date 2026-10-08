"use client";

import type { Prop } from "@/lib/db/schema";
import { PropCard } from "./prop-card";
import { PropDialog } from "./prop-dialog";
import { addButtonClass } from "@/lib/ui";

// Client board: the add-prop dialog trigger plus a card per catalog prop.
export function PropsBoard({ props }: { props: Prop[] }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <PropDialog triggerClassName={addButtonClass}>
        + Přidat rekvizitu
      </PropDialog>

      {props.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm italic">
          Zatím žádné rekvizity. Přidejte první výše.
        </p>
      ) : (
        props.map((p) => <PropCard key={p.id} prop={p} />)
      )}
    </div>
  );
}
