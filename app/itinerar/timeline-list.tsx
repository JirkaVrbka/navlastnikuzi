import type { ReactNode } from "react";
import type {
  EventWithRelations,
  ExistingType,
  PickableUser,
} from "@/lib/db/itinerary";
import type { PickableProp } from "@/lib/db/props";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { isEventRunning } from "@/lib/domain/delays";
import { EventTimelineRow } from "./event-timeline-row";
import { hhmm } from "./format";

// The shared timeline rail (mockup `.rail`): block dividers grouping consecutive
// events by `ev.block`, then the event rows. One list reused by the itinerary day
// sections, the itinerary past collapsible and the personal agenda — the only
// place the rail/divider markup lives. Presentational and hook-free, so it is
// safe in both server (agenda) and client (itinerary) trees; `now16` is supplied
// by the caller (live clock on the itinerary, server snapshot on the agenda).
export function TimelineList({
  events,
  timings,
  now16,
  dayId,
  dayDate,
  users,
  props,
  blocks,
  types,
  nowId,
  isAdmin = false,
}: {
  events: EventWithRelations[];
  timings: Map<string, DisplayedTiming>;
  now16: string | null;
  dayId: string;
  dayDate: string;
  users: PickableUser[];
  props: PickableProp[];
  blocks: string[];
  types: ExistingType[];
  nowId?: string;
  isAdmin?: boolean;
}) {
  const displayed = (ev: EventWithRelations) => {
    const t = timings.get(ev.id);
    return {
      start: t?.displayedStart ?? ev.startsAt,
      end: t?.displayedEnd ?? ev.endsAt,
    };
  };

  // Span label per block name: first displayed start → last displayed end over
  // the events it holds (mockup's `span`). Keyed by name so a block broken by a
  // non-block event still reports one span.
  const spans = new Map<string, { start: string; end: string }>();
  for (const ev of events) {
    if (!ev.block) continue;
    const { start, end } = displayed(ev);
    const cur = spans.get(ev.block);
    spans.set(ev.block, { start: cur?.start ?? start, end });
  }

  const items: ReactNode[] = [];
  let prevBlock: string | null | undefined = undefined;
  let prevWasEvent = false;
  let prevRunning = false;
  let firstEventSeen = false;

  for (const ev of events) {
    const block = ev.block ?? null;
    const timing = timings.get(ev.id);
    const { start, end } = displayed(ev);
    const running = isEventRunning(start, end, now16);

    // A divider before each new (non-null) block; a block boundary also breaks
    // the inter-row hairline (mockup: a row right after a `.blockdiv` has no
    // `.ev + .ev .body` border).
    if (block && block !== prevBlock) {
      const span = spans.get(block)!;
      items.push(
        <li
          key={`block-${ev.id}`}
          className="mt-3.5 mb-2 flex items-center gap-2.5"
        >
          <span className="text-gold text-[11px] font-semibold tracking-[0.2em] uppercase">
            {block}
          </span>
          <span className="text-muted-foreground text-[11px] tracking-[0.04em] tabular-nums">
            {hhmm(span.start)}–{hhmm(span.end)}
          </span>
          <span aria-hidden className="bg-border h-px flex-1" />
        </li>,
      );
      prevWasEvent = false;
    }
    prevBlock = block;

    // Hairline between consecutive rows, except: the running row is its own card,
    // and the row right after the running card drops its top border.
    const topBorder = prevWasEvent && !prevRunning && !running;

    items.push(
      <EventTimelineRow
        key={ev.id}
        ev={ev}
        timing={timing}
        now16={now16}
        dayId={dayId}
        dayDate={dayDate}
        users={users}
        props={props}
        blocks={blocks}
        types={types}
        nowId={nowId}
        first={!firstEventSeen}
        topBorder={topBorder}
        isAdmin={isAdmin}
      />,
    );

    firstEventSeen = true;
    prevWasEvent = true;
    prevRunning = running;
  }

  return <ol className="m-0 list-none p-0">{items}</ol>;
}
