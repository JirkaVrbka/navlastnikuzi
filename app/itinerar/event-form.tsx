"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createEvent, updateEvent, deleteEvent } from "./actions";
import { initialEventFormState } from "./types";
import type { EventWithRelations, PickableUser } from "@/lib/db/itinerary";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  OrganizerPicker,
  userLabel,
  type OrganizerValue,
} from "./organizer-picker";
import { BlockPicker } from "./block-picker";
import { ItemsInput } from "./items-input";
import { TimePicker } from "./time-picker";
import { hhmm } from "./format";

type TabId = "zaklad" | "zarazeni" | "detaily";

// Which tab each field lives in — used to jump to the first tab with an error
// after a failed submit so the user actually sees the message.
const FIELD_TAB: Record<string, TabId> = {
  title: "zaklad",
  startTime: "zaklad",
  endTime: "zaklad",
  location: "zaklad",
  block: "zarazeni",
  type: "zarazeni",
  color: "zarazeni",
  organizers: "detaily",
  items: "detaily",
  note: "detaily",
  link: "detaily",
};

const TABS: { id: TabId; label: string; n: string }[] = [
  { id: "zaklad", label: "Základ", n: "1 / 3" },
  { id: "zarazeni", label: "Zařazení", n: "2 / 3" },
  { id: "detaily", label: "Detaily", n: "3 / 3" },
];

// A single labelled control; its error (if any) shows below, outside the label
// so it doesn't pollute the field's accessible name.
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          {label}
        </span>
        {children}
      </label>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

// A group of controls (caption, not a <label>).
function Group({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
        {label}
      </span>
      {children}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

function initialOrganizers(event?: EventWithRelations): OrganizerValue[] {
  return (event?.organizers ?? []).map((o) =>
    o.profileId
      ? {
          type: "user",
          id: o.profileId,
          label: o.profile ? userLabel(o.profile) : o.profileId,
        }
      : { type: "text", label: o.name ?? "" },
  );
}

export function EventForm({
  dayId,
  dayDate,
  users,
  blocks,
  event,
  onSuccess,
}: {
  dayId: string;
  dayDate: string;
  users: PickableUser[];
  blocks: string[];
  event?: EventWithRelations;
  onSuccess: () => void;
}) {
  const action = event ? updateEvent : createEvent;
  const [state, formAction, pending] = useActionState(
    action,
    initialEventFormState,
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  const fe = state.fieldErrors ?? {};
  const [tab, setTab] = useState<TabId>("zaklad");

  // After a failed submit, jump to the first tab that contains an errored field
  // (so the message isn't hidden on an inactive tab). `state` is a fresh object
  // per dispatch, so this reacts once per submit result. Adjusting state during
  // render (not in an effect) is React's recommended pattern for responding to a
  // changed value.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    const keys = Object.keys(state.fieldErrors ?? {});
    if (keys.length > 0) {
      const firstTab = TABS.find((t) =>
        keys.some((k) => FIELD_TAB[k] === t.id),
      )?.id;
      if (firstTab) setTab(firstTab);
    }
  }

  const errorTabs = new Set(
    Object.keys(fe)
      .map((k) => FIELD_TAB[k])
      .filter(Boolean),
  );

  // Controlled fields so a failed submit keeps everything the user entered.
  const [title, setTitle] = useState(event?.title ?? "");
  const [startTime, setStartTime] = useState(event ? hhmm(event.startsAt) : "");
  const [endTime, setEndTime] = useState(event ? hhmm(event.endsAt) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [note, setNote] = useState(event?.note ?? "");
  const [link, setLink] = useState(event?.link ?? "");
  const [color, setColor] = useState(event?.color ?? "");
  const [block, setBlock] = useState(event?.block ?? "");
  const [items, setItems] = useState<string[]>(
    (event?.items ?? []).map((i) => i.content),
  );
  const [organizers, setOrganizers] = useState<OrganizerValue[]>(() =>
    initialOrganizers(event),
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="dayDate" value={dayDate} />
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      {/* Segmented tabs: Základ · Zařazení · Detaily (≥44px, gold when active). */}
      <div
        role="tablist"
        aria-label="Sekce úpravy"
        className="border-border bg-secondary flex gap-1 overflow-hidden rounded-[13px] border p-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center gap-px rounded-[9px] px-1 py-1.5 text-[11px] font-medium tracking-[0.08em] transition-colors",
                active
                  ? "text-gold-bright bg-gradient-to-b from-[color-mix(in_srgb,var(--gold)_20%,transparent)] to-[color-mix(in_srgb,var(--gold)_5%,transparent)] shadow-[inset_0_0_0_1px_var(--line-strong)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5">
                {t.label}
                {errorTabs.has(t.id) ? (
                  <span
                    aria-hidden
                    className="bg-destructive size-1.5 rounded-full"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[9px] tracking-[0.14em]",
                  active ? "text-gold" : "text-muted-foreground/70",
                )}
              >
                {t.n}
              </span>
            </button>
          );
        })}
      </div>

      {/* All panes stay MOUNTED (hidden toggles visibility) so every picker's
          hidden inputs keep submitting regardless of the active tab. */}
      <div className="min-h-0 flex-1 overflow-auto pt-4">
        <div hidden={tab !== "zaklad"} className="space-y-4">
          <Field label="Název" error={fe.title}>
            <Input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(fe.title)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Začátek" error={fe.startTime}>
              <TimePicker
                name="startTime"
                value={startTime}
                onChange={setStartTime}
                invalid={Boolean(fe.startTime)}
              />
            </Field>
            <Field label="Konec" error={fe.endTime}>
              <TimePicker
                name="endTime"
                value={endTime}
                onChange={setEndTime}
                invalid={Boolean(fe.endTime)}
              />
            </Field>
          </div>

          <Field label="Místo" error={fe.location}>
            <Input
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-invalid={Boolean(fe.location)}
            />
          </Field>
        </div>

        <div hidden={tab !== "zarazeni"} className="space-y-4">
          <Group label="Blok" error={fe.block}>
            <BlockPicker blocks={blocks} value={block} onChange={setBlock} />
          </Group>

          <Field label="Typ události" error={fe.type}>
            <Input
              name="type"
              defaultValue={event?.type ?? ""}
              placeholder="Výchozí: název události"
              aria-invalid={Boolean(fe.type)}
            />
          </Field>

          <Group label="Barva" error={fe.color}>
            <input type="hidden" name="color" value={color} />
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Barva"
                value={color || "#c9a264"}
                onChange={(e) => setColor(e.target.value)}
                className="border-input size-11 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
              />
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm tabular-nums">
                {color ? color : "Bez barvy"}
              </span>
              {color ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor("")}
                >
                  Bez barvy
                </Button>
              ) : null}
            </div>
          </Group>
        </div>

        <div hidden={tab !== "detaily"} className="space-y-4">
          <Group label="Organizátoři" error={fe.organizers}>
            <OrganizerPicker
              users={users}
              value={organizers}
              onChange={setOrganizers}
            />
          </Group>

          <Group label="Rekvizity" error={fe.items}>
            <ItemsInput value={items} onChange={setItems} />
          </Group>

          <Field label="Poznámka" error={fe.note}>
            <Textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              aria-invalid={Boolean(fe.note)}
            />
          </Field>

          <Field label="Odkaz na dokument" error={fe.link}>
            <Input
              type="url"
              name="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(fe.link)}
            />
          </Field>
        </div>
      </div>

      <div className="border-border bg-popover -mx-4 mt-6 flex flex-col gap-3 border-t px-4 pt-4">
        {state.formError ? (
          <p className="text-destructive text-sm" role="alert">
            {state.formError}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {event ? (
            <DeleteEventButton id={event.id} onDone={onSuccess} />
          ) : (
            <span />
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Ukládám…" : event ? "Uložit" : "Vytvořit"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DeleteEventButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Opravdu smazat událost?")) return;
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          await deleteEvent(fd);
          onDone();
        });
      }}
    >
      Smazat
    </Button>
  );
}
