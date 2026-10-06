"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDelay, removeDelay } from "./actions";
import type { EventDelay } from "@/lib/db/schema";
import { cn } from "cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = [15, 30, 45, 60];

// Per-event delay control: the trigger shows the event's own delay (or
// "Zpoždění"); the popover adds presets / a custom amount and lists the current
// delay entries, each removable.
export function DelayControl({
  eventId,
  delays,
  ownDelay,
}: {
  eventId: string;
  delays: EventDelay[];
  ownDelay: number;
}) {
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function add(minutes: number) {
    setError("");
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("minutes", String(minutes));
    start(async () => {
      const res = await addDelay(fd);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }
  function addCustom() {
    const m = Number(custom);
    if (!Number.isInteger(m) || m < 1) {
      setError("Zadejte kladný počet minut");
      return;
    }
    if (m > 600) {
      setError("Nejvýše 600 minut");
      return;
    }
    add(m);
    setCustom("");
  }
  function remove(id: string) {
    setError("");
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await removeDelay(fd);
      router.refresh();
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          // `.delay-chip`: oxblood pill when the event is delayed, a subtle
          // outline chip otherwise.
          "focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-[7px] rounded-full px-3.5 text-[13px] font-medium tracking-[0.03em] transition-colors outline-none focus-visible:ring-3",
          ownDelay > 0
            ? "text-gold-bright border border-[rgba(160,48,54,0.45)] bg-[rgba(123,30,34,0.2)] hover:bg-[rgba(123,30,34,0.34)] hover:shadow-[0_0_16px_rgba(160,48,54,0.35)]"
            : "border-border bg-secondary text-muted-foreground hover:border-primary hover:text-gold-bright border",
        )}
      >
        <span className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase">
          Zpoždění
        </span>
        {ownDelay > 0 ? `+${ownDelay} min` : null}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Přidat zpoždění</div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                disabled={pending}
                onClick={() => add(m)}
                className="bg-secondary hover:border-primary hover:text-gold-bright focus-visible:ring-ring/50 min-h-11 rounded-[10px] border border-[var(--line-strong)] px-3.5 text-[13px] tabular-nums transition-colors outline-none focus-visible:ring-3 disabled:opacity-50"
              >
                +{m}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={600}
              value={custom}
              placeholder="Vlastní (min)"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={addCustom}
            >
              Přidat
            </Button>
          </div>

          {error ? <p className="text-destructive text-xs">{error}</p> : null}

          {delays.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="text-muted-foreground text-xs">
                Zpoždění této události:
              </div>
              <ul className="flex flex-col gap-1">
                {delays.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>+{d.minutes} min</span>
                    <button
                      type="button"
                      aria-label={`Odebrat zpoždění ${d.minutes} minut`}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={pending}
                      onClick={() => remove(d.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
