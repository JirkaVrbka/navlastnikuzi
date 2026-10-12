import type { ExistingType, PickableUser } from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { AgendaGroup } from "@/lib/domain/agenda";
import { Card } from "@/components/ui/card";
import { AgendaGroupList } from "./agenda-group-list";
import { AgendaScroller } from "./agenda-scroller";

// Read-only "my events" list for the index. Mirrors the itinerary's timeline
// row look (cinematic .event rows: gold time, serif title, candle-spine on
// delayed events) but without the day-level controls (delay, edit, delete,
// add). Rows still open the same editable detail dialog. Past events render
// inline at the top above an invisible "now" anchor (`agenda-now`); upcoming
// events render below it. The whole list lives in an AgendaScroller: a bounded,
// internally-scrollable container whose own sticky "↓ Teď" pill jumps back to
// that anchor (and auto-scrolls to it on load) WITHIN the container, so the
// surrounding dashboard never moves.
export function MyAgenda({
  groups,
  pastGroups,
  users,
  props,
  blocks,
  types,
  now16,
}: {
  groups: AgendaGroup[];
  pastGroups: AgendaGroup[];
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  now16: string;
}) {
  // Nothing to list at all — keep the simple empty state, no scroller needed.
  if (pastGroups.length === 0 && groups.length === 0) {
    return (
      <Card className="px-4 text-center">
        <p className="text-muted-foreground text-sm italic">
          Nemáš žádné nadcházející události.
        </p>
      </Card>
    );
  }

  return (
    <AgendaScroller anchorId="agenda-now">
      <div className="flex flex-col gap-5">
        {pastGroups.length > 0 && (
          <AgendaGroupList
            groups={pastGroups}
            users={users}
            props={props}
            blocks={blocks}
            types={types}
            now16={now16}
            past
          />
        )}

        {/* The past↔upcoming boundary: the scroll target (manual OFFSET in
            AgendaScroller handles spacing — no scroll-mt here). */}
        <div id="agenda-now" aria-hidden />

        {groups.length === 0 ? (
          <Card className="px-4 text-center">
            <p className="text-muted-foreground text-sm italic">
              Nemáš žádné nadcházející události.
            </p>
          </Card>
        ) : (
          <AgendaGroupList
            groups={groups}
            users={users}
            props={props}
            blocks={blocks}
            types={types}
            now16={now16}
          />
        )}
      </div>
    </AgendaScroller>
  );
}
