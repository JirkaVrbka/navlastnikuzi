import type { ExistingType, PickableUser } from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { AgendaGroup } from "@/lib/domain/agenda";
import { Card } from "@/components/ui/card";
import { AgendaGroupList } from "./agenda-group-list";
import { PastAgendaCollapsible } from "./past-agenda-collapsible";

// Read-only "my events" list for the index. Mirrors the itinerary's timeline
// row look (cinematic .event rows: gold time, serif title, candle-spine on
// delayed events) but without the day-level controls (delay, edit, delete,
// add). Rows still open the same editable detail dialog. Past events are lifted
// into a single top collapsible (see PastAgendaCollapsible); upcoming events
// render below through the shared AgendaGroupList.
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
  return (
    <div className="flex flex-col gap-5">
      {pastGroups.length > 0 && (
        <PastAgendaCollapsible
          groups={pastGroups}
          users={users}
          props={props}
          blocks={blocks}
          types={types}
          now16={now16}
        />
      )}

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
  );
}
