"use client";

import { cn } from "cn";

// Human-readable duration label for a minute count.
//   95  → "1h 35m"
//   120 → "2h"
//   30  → "30m"
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0 && m === 0) return `${h}h`;
  return `${m}m`;
}

// Derive the "HH:mm" end time from a start time + duration (minutes). "" start
// → "" end. Wraps past midnight via mod 1440; combineDateTime rolls the end
// onto the next day when endTime < startTime, so no midnight special-casing.
export function computeEndTime(startTime: string, duration: number): string {
  if (!startTime) return "";
  const [hh, mm] = startTime.split(":").map(Number);
  const end = (hh * 60 + mm + duration) % 1440;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

// Minutes between two naive-local timestamps. Parses them (space → "T"), diffs
// in minutes, and rolls a non-positive diff onto the next day (+1440) so a
// midnight-crossing event yields a positive duration.
export function durationBetween(startsAt: string, endsAt: string): number {
  const start = new Date(startsAt.replace(" ", "T"));
  const end = new Date(endsAt.replace(" ", "T"));
  let diff = Math.round((end.getTime() - start.getTime()) / 60000);
  if (diff <= 0) diff += 1440;
  return diff;
}

const MIN = 5;
const MAX = 180;
const STEP = 5;

// Standard options: multiples of 5 from 5 to 180 minutes.
const STANDARD = Array.from(
  { length: (MAX - MIN) / STEP + 1 },
  (_, i) => MIN + i * STEP,
);

// Matches time-picker.tsx's selectClass so the duration dropdown sits flush with
// the rest of the form controls (same border/height/focus/invalid treatment).
const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-secondary text-foreground px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

// A duration dropdown (minutes). Controlled: `value` is a minute count; the
// form derives endTime from startTime + value. `extraOption` injects a legacy,
// out-of-range value (e.g. a 300-min tour) at its sorted position so merely
// opening the form never silently shortens a long event; it disappears once a
// standard option is picked.
export function DurationPicker({
  value,
  onChange,
  invalid,
  extraOption,
}: {
  value: number;
  onChange: (n: number) => void;
  invalid?: boolean;
  extraOption?: number;
}) {
  const options =
    extraOption !== undefined && !STANDARD.includes(extraOption)
      ? [...STANDARD, extraOption].sort((a, b) => a - b)
      : STANDARD;

  return (
    <select
      aria-label="Trvání"
      aria-invalid={invalid || undefined}
      className={cn(selectClass)}
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {options.map((min) => (
        <option key={min} value={min}>
          {formatDuration(min)}
        </option>
      ))}
    </select>
  );
}
