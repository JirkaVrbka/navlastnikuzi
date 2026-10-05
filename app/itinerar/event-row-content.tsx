import type { EventWithRelations } from "@/lib/db/itinerary";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { hhmm } from "./format";

// The inner markup of a timeline row (time range, title, delay shift note,
// location). Presentational and hook-free, so it renders in both server
// (MyAgenda) and client (DaySection) trees. Extracted from DaySection so the
// two timelines stay visually identical.
export function EventRowContent({
  ev,
  timing,
}: {
  ev: EventWithRelations;
  timing: DisplayedTiming | undefined;
}) {
  return (
    <>
      <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
        {hhmm(timing?.displayedStart ?? ev.startsAt)}–
        {hhmm(timing?.displayedEnd ?? ev.endsAt)}
      </span>
      <span className="font-medium">{ev.title}</span>
      {timing && timing.shiftMinutes > 0 ? (
        <span className="text-muted-foreground text-xs">
          (posunuto +{timing.shiftMinutes} min)
        </span>
      ) : null}
      {ev.location ? (
        <span className="text-muted-foreground text-sm">· {ev.location}</span>
      ) : null}
    </>
  );
}
