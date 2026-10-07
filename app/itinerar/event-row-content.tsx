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
  const organizers = ev.organizers
    .map((o) =>
      o.profileId
        ? (o.profile?.displayName ?? o.profile?.email ?? o.profileId)
        : (o.name ?? ""),
    )
    .filter(Boolean);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-gold text-[13px] font-medium tracking-[0.02em] tabular-nums">
            {hhmm(timing?.displayedStart ?? ev.startsAt)}–
            {hhmm(timing?.displayedEnd ?? ev.endsAt)}
          </span>
          {timing && timing.shiftMinutes !== 0 ? (
            <span className="text-muted-foreground text-xs italic">
              (posunuto {timing.shiftMinutes > 0 ? "+" : ""}
              {timing.shiftMinutes} min)
            </span>
          ) : null}
        </div>
        {ev.block ? (
          <span className="text-muted-foreground text-xs italic">
            {ev.block}
          </span>
        ) : null}
      </div>
      <div className="font-display text-xl leading-tight font-semibold">
        {ev.title}
        {ev.location ? (
          <span className="text-muted-foreground font-sans text-[13px] font-normal">
            {" "}
            · {ev.location}
          </span>
        ) : null}
      </div>
      {organizers.length > 0 ? (
        <div className="text-muted-foreground text-xs italic">
          {organizers.join(", ")}
        </div>
      ) : null}
    </div>
  );
}
