"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayWithEvents, PickableUser } from "@/lib/db/itinerary";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteDay } from "./actions";
import { EventDialog } from "./event-dialog";
import { DayEditDialog } from "./day-edit-dialog";
import { hhmm } from "./format";

export function DaySection({
  day,
  users,
}: {
  day: DayWithEvents;
  users: PickableUser[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {day.label}{" "}
          <span className="text-muted-foreground text-sm">({day.date})</span>
        </h2>
        <div className="flex items-center gap-1">
          <DayEditDialog day={day} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Smazat celý den i jeho události?")) return;
              const fd = new FormData();
              fd.set("id", day.id);
              start(async () => {
                await deleteDay(fd);
                router.refresh();
              });
            }}
          >
            Smazat den
          </Button>
        </div>
      </header>

      {day.events.length === 0 ? (
        <p className="text-muted-foreground text-sm">Zatím žádné události.</p>
      ) : (
        <ol className="flex flex-col divide-y rounded-md border">
          {day.events.map((ev) => (
            <li key={ev.id}>
              <EventDialog
                dayId={day.id}
                dayDate={day.date}
                users={users}
                event={ev}
                triggerClassName="hover:bg-muted flex w-full items-baseline gap-3 p-3 text-left"
              >
                <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
                  {hhmm(ev.startsAt)}–{hhmm(ev.endsAt)}
                </span>
                <span className="font-medium">{ev.title}</span>
                {ev.location ? (
                  <span className="text-muted-foreground text-sm">
                    · {ev.location}
                  </span>
                ) : null}
              </EventDialog>
            </li>
          ))}
        </ol>
      )}

      <EventDialog
        dayId={day.id}
        dayDate={day.date}
        users={users}
        triggerClassName={
          buttonVariants({ variant: "outline", size: "sm" }) + " self-start"
        }
      >
        + Přidat událost
      </EventDialog>
    </section>
  );
}
