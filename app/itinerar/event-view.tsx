"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { EventWithRelations } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import { hhmm } from "./format";
import { userLabel } from "./organizer-picker";
import { ItemChecklist } from "./item-checklist";
import { DelayControl } from "./delay-control";
import { TimePicker } from "./time-picker";
import {
  DurationPicker,
  computeEndTime,
  durationBetween,
} from "./duration-picker";
import { updateEventTime } from "./actions";

// Compact read-only view of an event (no inputs). "Upravit" switches to the form.
// The event title is already shown by the dialog's DialogTitle, so this view only
// renders the hero sub-header (chip / accent / time / delay) and the detail rows —
// it never repeats the title.
export function EventView({
  event,
  onEdit,
}: {
  event: EventWithRelations;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Inline "quick edit the time" state. startTime/duration mirror the form's
  // model (duration drives the computed endTime); reset from the event each time
  // the editor opens so a cancelled edit never lingers.
  const [editingTime, setEditingTime] = useState(false);
  const [startTime, setStartTime] = useState(hhmm(event.startsAt));
  const [duration, setDuration] = useState(() =>
    durationBetween(event.startsAt, event.endsAt),
  );
  const [error, setError] = useState("");

  function openTimeEditor() {
    setStartTime(hhmm(event.startsAt));
    setDuration(durationBetween(event.startsAt, event.endsAt));
    setError("");
    setEditingTime(true);
  }

  function saveTime() {
    const endTime = computeEndTime(startTime, duration);
    const fd = new FormData();
    fd.set("id", event.id);
    // Date part of the naive-local start ("YYYY-MM-DD"); works for both
    // "YYYY-MM-DD HH:mm:ss" and "...THH:mm".
    fd.set("dayDate", event.startsAt.slice(0, 10));
    fd.set("startTime", startTime);
    fd.set("endTime", endTime);
    setError("");
    startTransition(async () => {
      const res = await updateEventTime(fd);
      if (res.error) setError(res.error);
      else {
        router.refresh();
        setEditingTime(false);
      }
    });
  }

  // Keep a legacy out-of-range duration visible as an extra option (same rule as
  // the form) so opening the editor never silently shortens the event.
  const durationExtraOption =
    duration % 5 !== 0 || duration < 5 || duration > 180 ? duration : undefined;

  const ownDelay = event.delays.reduce((s, d) => s + d.minutes, 0);
  const organizers = event.organizers
    .map((o) =>
      o.profileId
        ? o.profile
          ? userLabel(o.profile)
          : o.profileId
        : (o.name ?? ""),
    )
    .filter(Boolean);

  // Chip label = the free-text type, else the title. Accent color (chip + dot +
  // spine) = the event's own color, gold when none is set. Driven through one
  // `--c` var so the color-mixes all share it (matches the timeline row).
  const chipLabel = event.type?.trim() || event.title;
  const accent = event.color ?? "var(--gold)";

  // Single compact meta line: Místo · Organizátoři · Blok (only parts present).
  const metaParts: { text: string; strong?: boolean }[] = [];
  if (event.location) metaParts.push({ text: event.location, strong: true });
  if (organizers.length > 0) metaParts.push({ text: organizers.join(", ") });
  if (event.block) metaParts.push({ text: event.block });

  return (
    <div style={{ ["--c" as string]: accent }} className="flex flex-col">
      {/* Hero sub-header: accent spine + chip/dot + time + delay. */}
      <div className="flex items-stretch gap-3">
        <span
          aria-hidden
          className="w-1 shrink-0 rounded-[4px] bg-[var(--c)] shadow-[0_0_14px_color-mix(in_srgb,var(--c)_60%,transparent)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="size-[11px] shrink-0 rounded-full bg-[var(--c)] shadow-[0_0_0_3px_var(--panel),0_0_10px_color-mix(in_srgb,var(--c)_70%,transparent)]"
            />
            <span className="inline-flex items-center rounded-full border [border-color:color-mix(in_srgb,var(--c)_42%,transparent)] bg-[color-mix(in_srgb,var(--c)_15%,transparent)] px-[10px] py-[3px] text-[10px] font-semibold tracking-[0.08em] text-[var(--c)] uppercase">
              {chipLabel}
            </span>
          </div>
          {editingTime ? (
            <div className="mt-2 flex flex-col gap-2.5">
              {/* Row 1: start time (left) + duration (right, same level). */}
              <div className="flex items-end gap-3">
                <div className="w-40 shrink-0">
                  <TimePicker
                    name="startTime"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
                <div className="ml-auto w-28 shrink-0">
                  <DurationPicker
                    value={duration}
                    onChange={setDuration}
                    extraOption={durationExtraOption}
                  />
                </div>
              </div>
              {/* Row 2: actions under the inputs. */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveTime}
                  disabled={pending}
                >
                  {pending ? "Ukládám…" : "Uložit"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingTime(false)}
                >
                  Zrušit
                </Button>
              </div>
              {error ? (
                <span className="text-destructive text-xs">{error}</span>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-gold text-[20px] font-medium tracking-[0.02em] tabular-nums">
                {hhmm(event.startsAt)}–{hhmm(event.endsAt)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Upravit čas"
                className="text-muted-foreground hover:text-gold-bright"
                onClick={openTimeEditor}
              >
                <span aria-hidden className="text-[13px]">
                  ✎
                </span>
              </Button>
              {ownDelay !== 0 ? (
                <span className="text-oxblood-soft inline-flex items-center gap-1 rounded-full border [border-color:color-mix(in_srgb,var(--oxblood-soft)_45%,transparent)] bg-[color-mix(in_srgb,var(--oxblood)_22%,transparent)] px-2 py-[3px] text-[10px] font-semibold tracking-[0.06em] uppercase">
                  {ownDelay > 0 ? "+" : ""}
                  {ownDelay} min zpoždění
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Compact meta line. */}
      {metaParts.length > 0 ? (
        <div className="text-muted-foreground mt-3.5 text-[12.5px] leading-[1.6] tracking-[0.02em]">
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 ? (
                <span className="text-muted-foreground/60 mx-1.5" aria-hidden>
                  ·
                </span>
              ) : null}
              <span
                className={part.strong ? "text-foreground font-medium" : ""}
              >
                {part.text}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {event.items.length > 0 ? (
        <Section label="Rekvizity">
          <ItemChecklist
            items={event.items.map((i) => ({
              id: i.id,
              content: i.prop?.name ?? i.content,
              checked: i.checked,
              inCatalog: Boolean(i.propId),
            }))}
          />
        </Section>
      ) : null}

      {event.note ? (
        <Section label="Poznámka">
          <div className="border-border bg-secondary rounded-[10px] border border-l-[3px] border-l-[var(--line-strong)] px-3.5 py-3">
            <p className="font-display-italic text-foreground text-[16px] leading-[1.45] whitespace-pre-wrap">
              {event.note}
            </p>
          </div>
        </Section>
      ) : null}

      {event.link ? (
        <Section label="Odkaz">
          <a
            href={event.link}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-gold-bright inline-flex items-center gap-[7px] text-[13.5px] break-all underline decoration-[color-mix(in_srgb,var(--gold)_40%,transparent)] underline-offset-4"
          >
            {event.link}
          </a>
        </Section>
      ) : null}

      <div className="border-border mt-[18px] flex items-center justify-between gap-2 border-t pt-3.5">
        <DelayControl
          eventId={event.id}
          delays={event.delays}
          ownDelay={ownDelay}
        />
        <Button type="button" onClick={onEdit}>
          Upravit
        </Button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-[18px]">
      <div className="text-muted-foreground mb-2 text-[10px] tracking-[0.18em] uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}
