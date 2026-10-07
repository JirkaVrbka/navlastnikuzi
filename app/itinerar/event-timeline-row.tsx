"use client";

import { cn } from "cn";
import type { EventWithRelations, PickableUser } from "@/lib/db/itinerary";
import type { DisplayedTiming } from "@/lib/domain/delays";
import { isEventRunning } from "@/lib/domain/delays";
import { EventDialog } from "./event-dialog";
import { hhmm } from "./format";
import { userLabel } from "./organizer-picker";

// One event on the timeline rail (mockup `.ev`): a 3-column grid
// `[time 50px | rail 20px | body 1fr]`. The body is the clickable trigger that
// opens the editable EventDialog (detail → Rekvizity / organizers / delay / color
// / type all still edited there). The row itself owns the running highlight and
// renders delays as read-only tags — the row never edits a delay.
//
// `first`/`topBorder` are supplied by `TimelineList`, which knows the row's place
// among its siblings (mockup's `.ev:first-of-type` rail trim and
// `.ev + .ev .body` hairline, suppressed around the running card).
export function EventTimelineRow({
  ev,
  timing,
  now16,
  dayId,
  dayDate,
  users,
  blocks,
  nowId,
  first = false,
  topBorder = false,
}: {
  ev: EventWithRelations;
  timing: DisplayedTiming | undefined;
  now16: string | null;
  dayId: string;
  dayDate: string;
  users: PickableUser[];
  blocks: string[];
  nowId?: string;
  first?: boolean;
  topBorder?: boolean;
}) {
  const start = timing?.displayedStart ?? ev.startsAt;
  const end = timing?.displayedEnd ?? ev.endsAt;
  const running = isEventRunning(start, end, now16);
  const ownDelay = timing?.ownDelay ?? 0;
  const shift = timing?.shiftMinutes ?? 0;

  // Chip label = the free-text type, else the title. Accent color (chip + dot) =
  // the event's own color, gold when none is set. Driven through one `--c` var so
  // the chip's color-mix and the dot share it (mockup's `--c`).
  const chipLabel = ev.type?.trim() || ev.title;
  const accent = ev.color ?? "var(--gold)";

  const organizers = ev.organizers
    .map((o) =>
      o.profileId
        ? o.profile
          ? userLabel(o.profile)
          : o.profileId
        : (o.name ?? ""),
    )
    .filter(Boolean);
  const metaParts = [ev.location, organizers.join(", ")].filter(Boolean);

  return (
    <li
      id={running ? nowId : undefined}
      style={{ ["--c" as string]: accent }}
      className="relative grid grid-cols-[50px_20px_1fr]"
    >
      {/* Time column: gold displayed start over muted displayed end. */}
      <div className="pt-3.5 pr-0.5 text-right">
        <span className="text-gold block text-[13px] font-medium tracking-[0.02em] tabular-nums">
          {hhmm(start)}
        </span>
        <span className="text-muted-foreground block text-[11px] tabular-nums">
          {hhmm(end)}
        </span>
      </div>

      {/* Rail column: a centered connecting line + the node dot. */}
      <div className="relative flex justify-center">
        <span
          aria-hidden
          className={cn(
            "bg-border absolute bottom-0 w-0.5",
            first ? "top-4" : "top-0",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "relative z-[1] mt-[17px] size-[11px] rounded-full shadow-[0_0_0_3px_var(--background)]",
            running
              ? "bg-gold size-[13px] shadow-[0_0_0_3px_var(--background),0_0_14px_var(--gold)] motion-safe:animate-pulse"
              : "bg-[var(--c)]",
          )}
        />
      </div>

      {/* Body: chip + now-pill, serif title, meta, delay tags — all clickable. */}
      <div
        className={cn(
          "min-w-0 py-3 pl-2.5",
          topBorder && "border-border border-t",
          running &&
            "my-1 rounded-[12px] border border-[var(--line-strong)] bg-gradient-to-b from-[color-mix(in_srgb,var(--gold)_10%,transparent)] to-[color-mix(in_srgb,var(--gold)_2%,transparent)] p-3",
        )}
      >
        <EventDialog
          dayId={dayId}
          dayDate={dayDate}
          users={users}
          blocks={blocks}
          event={ev}
          triggerClassName="hover:bg-foreground/[0.03] -mx-1.5 block w-full rounded-md px-1.5 py-1 text-left transition-colors"
        >
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-y-1">
              <span className="inline-flex items-center rounded-full border [border-color:color-mix(in_srgb,var(--c)_42%,transparent)] bg-[color-mix(in_srgb,var(--c)_15%,transparent)] px-[9px] py-[3px] text-[10px] font-semibold tracking-[0.08em] text-[var(--c)] uppercase">
                {chipLabel}
              </span>
              {running ? (
                <span className="text-gold-bright ml-2 inline-flex items-center gap-[5px] text-[10px] tracking-[0.14em] uppercase">
                  <span
                    aria-hidden
                    className="bg-gold size-1.5 rounded-full shadow-[0_0_8px_var(--gold)]"
                  />
                  Právě teď
                </span>
              ) : null}
            </div>

            <div className="font-display mt-1.5 text-lg leading-[1.18] font-semibold">
              {ev.title}
            </div>

            {metaParts.length > 0 ? (
              <div className="text-muted-foreground mt-[3px] text-xs tracking-[0.02em]">
                {metaParts.map((part, i) => (
                  <span key={i}>
                    {i > 0 ? (
                      <span
                        className="text-muted-foreground/70 mx-[5px]"
                        aria-hidden
                      >
                        ·
                      </span>
                    ) : null}
                    {part}
                  </span>
                ))}
              </div>
            ) : null}

            {ownDelay !== 0 || shift !== 0 ? (
              <div className="mt-[7px] flex flex-wrap gap-1.5">
                {ownDelay !== 0 ? (
                  <span className="text-red border-red/35 bg-red-bg inline-flex rounded-[6px] border px-2 py-0.5 text-[10px] tracking-[0.06em] tabular-nums">
                    {ownDelay > 0 ? "+" : ""}
                    {ownDelay} min
                  </span>
                ) : null}
                {shift !== 0 ? (
                  <span className="text-muted-foreground border-border inline-flex rounded-[6px] border bg-[var(--panel-2)] px-2 py-0.5 text-[10px] tracking-[0.06em] tabular-nums">
                    posunuto {shift > 0 ? "+" : ""}
                    {shift} min
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </EventDialog>
      </div>
    </li>
  );
}
