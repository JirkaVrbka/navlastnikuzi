"use client";

import { useState } from "react";
import type { ActiveConfession as ActiveConfessionData } from "@/lib/db/confession";
import type { Side } from "@/lib/validation/confession";
import {
  setPlacementDone,
  setPlacementNote,
  setPlacementSide,
} from "./actions";
import { ConfessionColumn } from "./confession-column";
import { FinishConfessionDialog } from "./finish-confession-dialog";
import { Card } from "@/components/ui/card";

// The active zpověď: every in-game player split across two columns (Sloupec A/B).
// ALL mutable per-row state — the column (`side`), the "Hotovo" flag, and the note
// draft/saved baseline — is lifted here, keyed by placementId. This is required
// because the two columns are separate lists: moving a player remounts its row in
// the other column, so any state held inside the row would re-initialize from the
// (stale) server prop and drop an unsaved note / flash the old done value. With
// the state here, PlacementRow is fully controlled and a move preserves everything.
// Every mutation is optimistic: set locally, persist, and revert (returning the
// server's Czech message) on failure. No auto-rebalance on a manual move — the
// live counts are shown so the organizer can even the columns out by hand.
export function ActiveConfession({
  confession,
}: {
  confession: ActiveConfessionData;
}) {
  const [sideByPlacement, setSideByPlacement] = useState<Record<string, Side>>(
    () =>
      Object.fromEntries(
        confession.placements.map((p) => [p.id, p.side as Side]),
      ),
  );
  const [doneByPlacement, setDoneByPlacement] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(confession.placements.map((p) => [p.id, p.done])));
  // The textarea's live value (survives a move/remount)…
  const [noteDraftByPlacement, setNoteDraftByPlacement] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(confession.placements.map((p) => [p.id, p.note ?? ""])),
  );
  // …and the last successfully-saved value, used to skip no-op saves and to revert
  // the baseline (not the typed draft) when a save is rejected.
  const [noteSavedByPlacement, setNoteSavedByPlacement] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(confession.placements.map((p) => [p.id, p.note ?? ""])),
  );

  // Optimistic move to the other column: flip locally, persist, roll back (and
  // return the error) if the server rejects it (e.g. the zpověď was finished).
  async function move(placementId: string): Promise<string> {
    const prev = sideByPlacement[placementId];
    if (!prev) return "";
    const next: Side = prev === "a" ? "b" : "a";
    setSideByPlacement((m) => ({ ...m, [placementId]: next }));
    const res = await setPlacementSide(placementId, next);
    if (res.error) {
      setSideByPlacement((m) => ({ ...m, [placementId]: prev }));
      return res.error;
    }
    return "";
  }

  // Optimistic "Hotovo" toggle: flip locally, persist, revert on failure.
  async function toggleDone(
    placementId: string,
    next: boolean,
  ): Promise<string> {
    const prev = doneByPlacement[placementId] ?? false;
    setDoneByPlacement((m) => ({ ...m, [placementId]: next }));
    const res = await setPlacementDone(placementId, next);
    if (res.error) {
      setDoneByPlacement((m) => ({ ...m, [placementId]: prev }));
      return res.error;
    }
    return "";
  }

  // Live textarea edits — draft only, no server call until blur.
  function changeNote(placementId: string, value: string) {
    setNoteDraftByPlacement((m) => ({ ...m, [placementId]: value }));
  }

  // Persist the note on blur: skip if unchanged, else optimistically advance the
  // saved baseline, persist, and revert the baseline (keeping the typed draft) on
  // failure so the organizer doesn't lose what they wrote.
  async function saveNote(placementId: string): Promise<string> {
    const trimmed = (noteDraftByPlacement[placementId] ?? "").trim();
    const prevSaved = noteSavedByPlacement[placementId] ?? "";
    if (trimmed === prevSaved) return "";
    setNoteSavedByPlacement((m) => ({ ...m, [placementId]: trimmed }));
    const res = await setPlacementNote(placementId, trimmed);
    if (res.error) {
      setNoteSavedByPlacement((m) => ({ ...m, [placementId]: prevSaved }));
      return res.error;
    }
    return "";
  }

  const sideOf = (p: { id: string; side: string }) =>
    sideByPlacement[p.id] ?? (p.side as Side);
  const columnA = confession.placements.filter((p) => sideOf(p) === "a");
  const columnB = confession.placements.filter((p) => sideOf(p) === "b");

  return (
    <Card className="gap-4 overflow-visible p-4">
      <h2 className="font-display flex items-center gap-2.5 text-[23px] font-semibold">
        <span
          aria-hidden
          className="bg-oxblood-soft size-2 animate-pulse rounded-full shadow-[0_0_10px_var(--oxblood-soft)]"
        />
        Aktivní zpověď
      </h2>

      {/* Sticky balance summary — live counts per column. */}
      <div className="bg-background/90 border-border sticky top-0 z-20 -mx-4 flex gap-2.5 border-b px-4 py-3 backdrop-blur-md">
        <div className="border-border flex-1 rounded-xl border bg-[var(--panel)] px-3 py-2">
          <div className="flex items-baseline justify-between gap-1.5">
            <span className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              Sloupec A
            </span>
            <span className="font-display text-gold-bright text-[19px] font-bold tabular-nums">
              {columnA.length}
            </span>
          </div>
        </div>
        <div className="border-border flex-1 rounded-xl border bg-[var(--panel)] px-3 py-2">
          <div className="flex items-baseline justify-between gap-1.5">
            <span className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              Sloupec B
            </span>
            <span className="font-display text-gold-bright text-[19px] font-bold tabular-nums">
              {columnB.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-2">
        <ConfessionColumn
          label="Sloupec A"
          count={columnA.length}
          side="a"
          placements={columnA}
          doneByPlacement={doneByPlacement}
          noteByPlacement={noteDraftByPlacement}
          onMove={move}
          onToggleDone={toggleDone}
          onChangeNote={changeNote}
          onSaveNote={saveNote}
        />
        <ConfessionColumn
          label="Sloupec B"
          count={columnB.length}
          side="b"
          placements={columnB}
          doneByPlacement={doneByPlacement}
          noteByPlacement={noteDraftByPlacement}
          onMove={move}
          onToggleDone={toggleDone}
          onChangeNote={changeNote}
          onSaveNote={saveNote}
        />
      </div>

      <FinishConfessionDialog confessionId={confession.id} />
    </Card>
  );
}
