"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ConfessionPlacementRow } from "@/lib/db/confession";
import type { Side } from "@/lib/validation/confession";
import { CandidateAvatar } from "@/app/hlasovani/candidate-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const captionClass =
  "text-muted-foreground text-[10px] tracking-[0.12em] uppercase";

// One compact placement inside a column: avatar + player name, a "Hotovo" check,
// a move button to the other column, and a per-zpověď note. The row is fully
// CONTROLLED — the parent (ActiveConfession) owns the side, the done flag, and the
// note draft/save, so moving a player (which remounts the row in the other column)
// preserves an unsaved note and the toggled done state. Each handler performs the
// optimistic update + revert in the parent and returns the server's Czech message
// on failure, which the row surfaces inline.
export function PlacementRow({
  placement,
  side,
  done,
  note,
  onMove,
  onToggleDone,
  onChangeNote,
  onSaveNote,
}: {
  placement: ConfessionPlacementRow;
  side: Side;
  done: boolean;
  note: string;
  onMove: (placementId: string) => Promise<string>;
  onToggleDone: (placementId: string, next: boolean) => Promise<string>;
  onChangeNote: (placementId: string, value: string) => void;
  onSaveNote: (placementId: string) => Promise<string>;
}) {
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");

  const name = placement.player.nickname?.trim() || placement.player.name;

  async function toggleDone(next: boolean) {
    setError("");
    const err = await onToggleDone(placement.id, next);
    if (err) setError(err);
  }

  async function saveNote() {
    setError("");
    const err = await onSaveNote(placement.id);
    if (err) setError(err);
  }

  async function handleMove() {
    setError("");
    setMoving(true);
    const err = await onMove(placement.id);
    setMoving(false);
    if (err) setError(err);
  }

  const inputId = `zpoved-done-${placement.id}`;
  const spine = done
    ? "border-l-green shadow-[0_0_14px_-6px_rgba(127,174,118,0.5)]"
    : "border-l-[var(--line-strong)]";

  return (
    <li
      className={`border-border flex flex-col gap-2 rounded-lg border border-l-[3px] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] px-2 py-2 transition-[border-color,box-shadow] ${spine}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <CandidateAvatar
          name={placement.player.name}
          nickname={placement.player.nickname}
          picturePath={placement.player.picturePath}
        />
        <span
          className={`font-display min-w-0 flex-1 truncate text-[15px] leading-tight font-semibold ${
            done ? "text-muted-foreground" : ""
          }`}
          title={name}
        >
          {name}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="flex min-h-11 cursor-pointer items-center gap-1.5 select-none"
        >
          <Checkbox
            id={inputId}
            className="size-5"
            checked={done}
            onCheckedChange={(value) => void toggleDone(value)}
          />
          <span
            className={`text-xs ${done ? "text-green" : "text-muted-foreground"}`}
          >
            Hotovo
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleMove()}
          disabled={moving}
          aria-label={
            side === "a"
              ? `Přesunout ${name} do sloupce B`
              : `Přesunout ${name} do sloupce A`
          }
          className="border-border bg-secondary text-muted-foreground hover:border-primary hover:text-gold-bright flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-medium tracking-[0.06em] uppercase transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {side === "a" ? (
            <>
              B<ArrowRight aria-hidden className="size-3.5" />
            </>
          ) : (
            <>
              <ArrowLeft aria-hidden className="size-3.5" />A
            </>
          )}
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className={captionClass}>Poznámka</span>
        <Textarea
          value={note}
          onChange={(e) => onChangeNote(placement.id, e.target.value)}
          onBlur={() => void saveNote()}
          rows={2}
          maxLength={500}
          placeholder="Poznámka k hráči…"
          aria-label={`Poznámka — ${name}`}
          className="min-h-11 resize-none text-[13px]"
        />
      </label>

      {error ? (
        <p className="text-red text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
