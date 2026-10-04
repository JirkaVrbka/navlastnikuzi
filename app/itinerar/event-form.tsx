"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createEvent, updateEvent, deleteEvent } from "./actions";
import { initialEventFormState } from "./types";
import type { EventWithRelations, PickableUser } from "@/lib/db/itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  OrganizerPicker,
  userLabel,
  type OrganizerValue,
} from "./organizer-picker";
import { ItemsInput } from "./items-input";
import { TimePicker } from "./time-picker";
import { hhmm } from "./format";

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
      <label className="flex flex-col gap-1">
        <span className="font-medium">{label}</span>
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
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
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
  event,
  onSuccess,
}: {
  dayId: string;
  dayDate: string;
  users: PickableUser[];
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

  // Controlled fields so a failed submit keeps everything the user entered.
  const [title, setTitle] = useState(event?.title ?? "");
  const [startTime, setStartTime] = useState(event ? hhmm(event.startsAt) : "");
  const [endTime, setEndTime] = useState(event ? hhmm(event.endsAt) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [note, setNote] = useState(event?.note ?? "");
  const [link, setLink] = useState(event?.link ?? "");
  const [items, setItems] = useState<string[]>(
    (event?.items ?? []).map((i) => i.content),
  );
  const [organizers, setOrganizers] = useState<OrganizerValue[]>(() =>
    initialOrganizers(event),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="dayDate" value={dayDate} />
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

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
