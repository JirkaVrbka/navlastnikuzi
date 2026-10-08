"use client";

import type { ReactNode } from "react";
import type { EventWithRelations } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import { hhmm } from "./format";
import { userLabel } from "./organizer-picker";
import { ItemChecklist } from "./item-checklist";
import { DelayControl } from "./delay-control";

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-gold text-[20px] font-medium tracking-[0.02em] tabular-nums">
              {hhmm(event.startsAt)}–{hhmm(event.endsAt)}
            </span>
            {ownDelay !== 0 ? (
              <span className="text-oxblood-soft inline-flex items-center gap-1 rounded-full border [border-color:color-mix(in_srgb,var(--oxblood-soft)_45%,transparent)] bg-[color-mix(in_srgb,var(--oxblood)_22%,transparent)] px-2 py-[3px] text-[10px] font-semibold tracking-[0.06em] uppercase">
                {ownDelay > 0 ? "+" : ""}
                {ownDelay} min zpoždění
              </span>
            ) : null}
          </div>
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
