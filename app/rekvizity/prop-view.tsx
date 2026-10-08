"use client";

import type { ReactNode } from "react";
import type { Prop } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

// Read-only prop detail inside the dialog: name, owned count, Máme/Nemáme, note,
// and an "Upravit" toggle to the form. Mirrors PlayerView's structure/Row helper.
export function PropView({ prop, onEdit }: { prop: Prop; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Row label="Název">{prop.name}</Row>

      <Row label="Počet">
        <span className="tabular-nums">{prop.count} ks</span>
      </Row>

      <Row label="Stav">
        {prop.haveIt ? (
          <span className="text-green font-medium">Máme</span>
        ) : (
          <span className="text-red font-medium">Nemáme</span>
        )}
      </Row>

      {prop.note ? (
        <Row label="Poznámka">
          <span className="whitespace-pre-wrap">{prop.note}</span>
        </Row>
      ) : null}

      <div className="flex justify-end pt-1">
        <Button type="button" onClick={onEdit}>
          Upravit
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
