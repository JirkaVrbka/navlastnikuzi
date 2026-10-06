"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { eliminatePlayer, revivePlayer } from "./actions";
import { reasonLabel, REASON_OPTIONS } from "./labels";
import type { PlayerWithNotes } from "@/lib/db/players";
import type { EliminateReason } from "@/lib/validation/players";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

// Read-only player detail inside the dialog: status, drop-out order + reason,
// the eliminate (reason) / bring-back control, and an "Upravit" toggle to the
// form. Status actions refresh in place so the view reflects the new state.
export function PlayerView({
  player,
  dropoutOrder,
  onEdit,
  onChanged,
}: {
  player: PlayerWithNotes;
  dropoutOrder?: number;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<EliminateReason>("killed");
  const [error, setError] = useState("");

  function eliminate() {
    setError("");
    const fd = new FormData();
    fd.set("id", player.id);
    fd.set("reason", reason);
    start(async () => {
      const res = await eliminatePlayer(fd);
      if (res.error) setError(res.error);
      else onChanged();
    });
  }

  function revive() {
    setError("");
    const fd = new FormData();
    fd.set("id", player.id);
    start(async () => {
      await revivePlayer(fd);
      onChanged();
    });
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {player.nickname ? <Row label="Přezdívka">{player.nickname}</Row> : null}

      <Row label="Stav">
        {player.inGame ? (
          <span className="text-green font-medium">Ve hře</span>
        ) : (
          <span className="text-red font-medium">
            Vyřazen(a)
            {dropoutOrder ? ` · pořadí #${dropoutOrder}` : ""}
          </span>
        )}
      </Row>

      {!player.inGame && player.reason ? (
        <Row label="Důvod">{reasonLabel(player.reason)}</Row>
      ) : null}

      {player.notes.length > 0 ? (
        <Row label="Poznámky">
          <ul className="flex flex-col gap-1">
            {player.notes.map((n) => (
              <li key={n.id} className="whitespace-pre-wrap">
                {n.content}
              </li>
            ))}
          </ul>
        </Row>
      ) : null}

      <div className="flex flex-col gap-2 border-t pt-3">
        {player.inGame ? (
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                Vyřadit hráče
              </span>
              <select
                aria-label="Důvod vyřazení"
                className={selectClass}
                value={reason}
                onChange={(e) => setReason(e.target.value as EliminateReason)}
              >
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={eliminate}
            >
              Vyřadit
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={revive}
            className="self-start"
          >
            Vrátit do hry
          </Button>
        )}
        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end pt-1">
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
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
