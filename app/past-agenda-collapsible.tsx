"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { ExistingType, PickableUser } from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { AgendaGroup } from "@/lib/domain/agenda";
import { Button } from "@/components/ui/button";
import { AgendaGroupList } from "./agenda-group-list";

// All of my already-ended events, collected into one page-level collapsible at
// the top of the personal agenda, grouped by day. Collapsed by default. Mirrors
// the itinerary's ghost toggle (lucide ChevronRight rotating to 90° when open,
// aria-expanded). Rendered only when there is at least one past group.
export function PastAgendaCollapsible({
  groups,
  users,
  props,
  blocks,
  types,
  now16,
}: {
  groups: AgendaGroup[];
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  now16: string;
}) {
  const [open, setOpen] = useState(false);
  const totalCount = groups.reduce((sum, g) => sum + g.events.length, 0);

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground min-h-11 w-full justify-between px-2"
      >
        <span>Uplynulé události ({totalCount})</span>
        <ChevronRight
          className={cn("transition-transform", open && "rotate-90")}
          aria-hidden
        />
      </Button>
      {open && (
        <div className="mt-1 flex flex-col gap-4">
          <AgendaGroupList
            groups={groups}
            users={users}
            props={props}
            blocks={blocks}
            types={types}
            now16={now16}
            past
          />
        </div>
      )}
    </div>
  );
}
