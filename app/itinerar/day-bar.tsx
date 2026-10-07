import type { ReactNode } from "react";

// The sticky day switcher bar from the timeline mockup (`.daybar`): a blurred
// strip that bleeds to the phone column edges, holding a dark rounded day plate
// (serif label + muted date) and, on the right, any day-level controls (the
// settings cog on the itinerary, the "↓ Teď" jump button). Presentational and
// hook-free, so it renders in both the server (agenda) and client (itinerary)
// trees. Rows flow below it as one continuous rail — no per-day card.
export function DayBar({
  label,
  date,
  children,
}: {
  label: string;
  date: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-border sticky top-0 z-20 -mx-[18px] mb-3.5 flex items-center gap-2 border-b px-[18px] py-2.5 backdrop-blur-[10px]">
      <span className="font-display min-w-0 flex-1 rounded-[12px] border border-[var(--line-strong)] bg-[var(--charcoal)] px-3.5 py-2 text-[21px] leading-none font-semibold">
        {label}{" "}
        <small className="text-muted-foreground font-sans text-xs font-normal tracking-[0.06em] tabular-nums">
          {date}
        </small>
      </span>
      {children}
    </div>
  );
}
