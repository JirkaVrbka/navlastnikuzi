"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "cn";

// Zero-padded option values: hours 00–23, minutes 00–59.
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

// Styled to match the shadcn <Input> (same border/height/invalid treatment),
// so the two selects sit flush with the rest of the form controls.
const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

// A 24-hour time picker built from two <select> (hours + minutes). Unlike the
// native <input type="time">, it is guaranteed 24h on every browser/OS.
//
// Controlled: `value` is "HH:MM" (or "" when unset). The wire format is kept
// exactly as before via a hidden input, so validation/actions/DB are unchanged.
export function TimePicker({
  name,
  value,
  onChange,
  invalid,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  // Keep the two parts locally: `value` only ever holds a complete "HH:MM" (or
  // "" when a part is missing), so a half-entered hour would otherwise be lost
  // before the minute is picked.
  const [vHour = "", vMinute = ""] = value ? value.split(":") : [];
  const [hour, setHour] = useState(vHour);
  const [minute, setMinute] = useState(vMinute);

  // Sync down when the parent sets a full time from outside (e.g. editing an
  // existing event). A blank `value` is left alone so a partial pick survives
  // a failed submit (it serialized to "" but the selects should stay filled).
  // Adjusting state during render (not in an effect) is React's recommended
  // pattern for resetting local state from a changed prop.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value && value !== `${hour}:${minute}`) {
      setHour(vHour);
      setMinute(vMinute);
    }
  }

  // Emit "HH:MM" only when both parts are set; otherwise "" (never a half
  // value like "08:"), so required/validation still fires.
  function update(nextHour: string, nextMinute: string) {
    setHour(nextHour);
    setMinute(nextMinute);
    onChange(nextHour && nextMinute ? `${nextHour}:${nextMinute}` : "");
  }

  // React 19 resets the <form> after a server action; that native reset clears
  // the selects' DOM selection, which React does not always re-apply for a
  // controlled <select>. Re-assert the DOM value from state after each render
  // so a partial/complete pick survives a failed submit.
  const hourRef = useRef<HTMLSelectElement>(null);
  const minuteRef = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    if (hourRef.current && hourRef.current.value !== hour)
      hourRef.current.value = hour;
    if (minuteRef.current && minuteRef.current.value !== minute)
      minuteRef.current.value = minute;
  });

  return (
    <div className="flex items-center gap-2">
      <select
        ref={hourRef}
        aria-label={`${name}-hour`}
        aria-invalid={invalid || undefined}
        className={cn(selectClass)}
        value={hour}
        onChange={(e) => update(e.target.value, minute)}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        ref={minuteRef}
        aria-label={`${name}-minute`}
        aria-invalid={invalid || undefined}
        className={cn(selectClass)}
        value={minute}
        onChange={(e) => update(hour, e.target.value)}
      >
        <option value="">--</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {/* Keeps the form submitting startTime/endTime exactly as before. */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
