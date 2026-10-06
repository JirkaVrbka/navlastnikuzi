import type { EventWithRelations } from "@/lib/db/itinerary";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { hhmm } from "./format";

// The inner markup of a timeline row (time range, title, delay shift note,
// location). Presentational and hook-free, so it renders in both server
// (MyAgenda) and client (DaySection) trees. Extracted from DaySection so the
// two timelines stay visually identical.
//
// Self-contained vertical block (its own flex-col wrapper) so it lays out the
// same whether the parent trigger is a flex row (MyAgenda) or a block
// (DaySection) — see the cinematic `.event` markup in the design mockup.
export function EventRowContent({
  ev,
  timing,
}: {
  ev: EventWithRelations;
  timing: DisplayedTiming | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-gold text-[13px] font-medium tracking-[0.02em] tabular-nums">
        {hhmm(timing?.displayedStart ?? ev.startsAt)}–
        {hhmm(timing?.displayedEnd ?? ev.endsAt)}
      </span>
      <div className="font-display text-xl leading-tight font-semibold">
        {ev.title}
        {ev.location ? (
          <span className="text-muted-foreground font-sans text-[13px] font-normal">
            {" "}
            · {ev.location}
          </span>
        ) : null}
      </div>
      {timing && timing.shiftMinutes > 0 ? (
        <div className="text-muted-foreground text-xs italic">
          (posunuto +{timing.shiftMinutes} min)
        </div>
      ) : null}
    </div>
  );
}
