"use client";

import type { ReactNode } from "react";
import type { EventWithRelations } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import { hhmm } from "./format";
import { userLabel } from "./organizer-picker";
import { ItemChecklist } from "./item-checklist";
import { DelayControl } from "./delay-control";

// Compact read-only view of an event (no inputs). "Upravit" switches to the form.
export function EventView({
  event,
  onEdit,
}: {
  event: EventWithRelations;
  onEdit: () => void;
}) {
  const ownDelay = event.delays.reduce((s, d) => s + d.minutes, 0);
  const organizers = event.organizers.map((o) =>
    o.profileId
      ? o.profile
        ? userLabel(o.profile)
        : o.profileId
      : (o.name ?? ""),
  );

  return (
    <div className="flex flex-col gap-3 text-sm">
      <Row label="Čas">
        {hhmm(event.startsAt)}–{hhmm(event.endsAt)}
      </Row>
      {event.location ? <Row label="Místo">{event.location}</Row> : null}
      {event.color ? (
        <Row label="Barva">
          <span className="flex items-center gap-2">
            <span
              className="border-border size-4 shrink-0 rounded-[4px] border"
              style={{ backgroundColor: event.color }}
            />
            <span className="tabular-nums">{event.color}</span>
          </span>
        </Row>
      ) : null}
      {organizers.length > 0 ? (
        <Row label="Organizátoři">{organizers.join(", ")}</Row>
      ) : null}
      {event.block ? <Row label="Blok">{event.block}</Row> : null}
      {event.items.length > 0 ? (
        <Row label="Rekvizity">
          <ItemChecklist
            items={event.items.map((i) => ({
              id: i.id,
              content: i.content,
              checked: i.checked,
            }))}
          />
        </Row>
      ) : null}
      {event.note ? (
        <Row label="Poznámka">
          <span className="whitespace-pre-wrap">{event.note}</span>
        </Row>
      ) : null}
      {event.link ? (
        <Row label="Odkaz">
          <a
            href={event.link}
            target="_blank"
            rel="noreferrer"
            className="text-primary break-all underline underline-offset-4"
          >
            {event.link}
          </a>
        </Row>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-28 shrink-0 pt-0.5 text-[11px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
