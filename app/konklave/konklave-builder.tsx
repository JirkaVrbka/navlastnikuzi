"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "cn";
import { initials } from "@/app/hraci/labels";
import { InitialsAvatar, RoomIcon } from "./chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startKonklave, replaceKonklavePlacements } from "./actions";

// ── Types ───────────────────────────────────────────────────────────────────
type Room = { id: string; name: string };
type Player = { id: string; name: string; nickname: string | null };
type Organizer = { id: string; email: string; displayName: string | null };

// A line pairs one room with one player (either slot may still be empty while
// composing). A box groups the lines handled by one organizer. Both exported so
// the active view can seed the builder's edit mode from its placements.
export type Line = { room: string | null; player: string | null };
// A box may have no organizer yet — the organizer is chosen manually per box.
export type Box = { id: string; organizerId: string | null; lines: Line[] };

// A placed item carries its origin in `from`; source-column chips leave it
// undefined. Having the origin lets onDragEnd relocate a placed item directly.
type DragData = {
  kind: "room" | "player";
  itemId: string;
  from?: { boxId: string; lineIndex: number };
};

// What a droppable exposes via its drag data (a box body or a line slot).
type DropTarget =
  | { type: "box"; boxId: string }
  | { type: "slot"; boxId: string; lineIndex: number; kind: string };

// Nested droppables (line slots inside box bodies): prefer the pointer-based
// hit (works for the mouse/touch sensors and picks the innermost slot), and
// fall back to rectangle intersection so the keyboard sensor still resolves a
// target when there is no pointer.
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args);
};

const orgLabel = (o: Organizer) => o.displayName?.trim() || o.email;
const playerLabel = (p: Player) => p.nickname?.trim() || p.name;

// ── Draggable source chip ─────────────────────────────────────────────────────
function SourceChip({
  kind,
  item,
}: {
  kind: "room" | "player";
  item: Room | Player;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${kind}:${item.id}`,
    data: { kind, itemId: item.id } satisfies DragData,
  });
  const label =
    kind === "room" ? (item as Room).name : playerLabel(item as Player);
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "text-foreground hover:border-primary focus-visible:ring-ring focus-visible:border-ring flex min-h-[30px] cursor-grab touch-none items-center gap-1.5 rounded-[10px] border border-[var(--line-strong)] bg-[var(--panel-2)] py-1 pr-2 pl-1.5 text-left transition-colors outline-none select-none focus-visible:ring-2 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {kind === "room" ? (
        <RoomIcon className="size-[22px] text-[12px]" />
      ) : (
        <InitialsAvatar name={label} className="size-[22px] text-[10px]" />
      )}
      <span className="font-display text-[14px] leading-none font-semibold">
        {label}
      </span>
    </button>
  );
}

// A static (non-draggable) chip body for the DragOverlay.
function ChipPreview({
  kind,
  label,
}: {
  kind: "room" | "player";
  label: string;
}) {
  return (
    <div className="border-primary flex min-h-[30px] items-center gap-1.5 rounded-[10px] border bg-[var(--panel-2)] py-1 pr-2 pl-1.5 shadow-[var(--shadow)]">
      {kind === "room" ? (
        <RoomIcon className="size-[22px] text-[12px]" />
      ) : (
        <InitialsAvatar name={label} className="size-[22px] text-[10px]" />
      )}
      <span className="font-display text-[14px] leading-none font-semibold">
        {label}
      </span>
    </div>
  );
}

// ── Draggable chip for an already-placed item ────────────────────────────────
// Lets the user move a filled slot's room/player to another assignment without
// clearing it first. The ✕ clear button lives OUTSIDE this node, so a click on
// it never starts a drag.
function PlacedChip({
  boxId,
  lineIndex,
  kind,
  itemId,
  label,
}: {
  boxId: string;
  lineIndex: number;
  kind: "room" | "player";
  itemId: string;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed:${boxId}:${lineIndex}:${kind}`,
    data: { kind, itemId, from: { boxId, lineIndex } } satisfies DragData,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex min-w-0 flex-1 cursor-grab touch-none items-center gap-1.5 text-left outline-none select-none active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {kind === "room" ? (
        <RoomIcon className="size-[21px] rounded-[6px] text-[11px]" />
      ) : (
        <InitialsAvatar name={label} className="size-[21px] text-[10px]" />
      )}
      <span className="font-display truncate text-[14px] font-semibold">
        {label}
      </span>
    </button>
  );
}

// ── Line slot (droppable) ─────────────────────────────────────────────────────
function Slot({
  boxId,
  lineIndex,
  kind,
  value,
  activeKind,
  onClear,
}: {
  boxId: string;
  lineIndex: number;
  kind: "room" | "player";
  value: { label: string; itemId: string } | null;
  activeKind: "room" | "player" | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${boxId}:${lineIndex}:${kind}`,
    data: { type: "slot", boxId, lineIndex, kind },
  });
  const matching = activeKind === kind;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[34px] items-center gap-1.5 rounded-[10px] border px-2 py-1 text-sm transition-colors",
        value
          ? kind === "room"
            ? "border-[var(--gold)]/40 bg-[var(--gold)]/10"
            : "border-[var(--green)]/40 bg-[var(--green)]/10"
          : "border-dashed border-[var(--line-strong)] bg-black/20",
        isOver && matching && "border-primary bg-[var(--gold)]/[0.16]",
      )}
    >
      {value ? (
        <>
          <PlacedChip
            boxId={boxId}
            lineIndex={lineIndex}
            kind={kind}
            itemId={value.itemId}
            label={value.label}
          />
          <button
            type="button"
            onClick={onClear}
            aria-label={kind === "room" ? "Odebrat pokoj" : "Odebrat hráče"}
            className="text-muted-foreground hover:text-red hover:bg-red-bg rounded-[7px] px-1 text-sm"
          >
            ✕
          </button>
        </>
      ) : (
        <span className="text-muted-foreground text-[11px] italic">
          {kind === "room" ? "pokoj…" : "hráč…"}
        </span>
      )}
    </div>
  );
}

// ── Box (droppable body) ──────────────────────────────────────────────────────
function BoxCard({
  box,
  organizer,
  roomLabel,
  playerLabelOf,
  activeKind,
  onClearSlot,
  onRemoveLine,
  onRemoveBox,
}: {
  box: Box;
  organizer: Organizer | null;
  roomLabel: (id: string) => string;
  playerLabelOf: (id: string) => string;
  activeKind: "room" | "player" | null;
  onClearSlot: (lineIndex: number, kind: "room" | "player") => void;
  onRemoveLine: (lineIndex: number) => void;
  onRemoveBox: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `box:${box.id}`,
    data: { type: "box", boxId: box.id },
  });
  const pairs = box.lines.filter((l) => l.room && l.player).length;
  const orgName = organizer ? orgLabel(organizer) : null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-[14px] border border-[var(--line-strong)] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] p-2.5 transition-shadow",
        isOver &&
          "border-primary shadow-[0_0_0_2px_rgba(201,162,100,0.25)_inset]",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "font-display flex size-[25px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
            organizer
              ? "bg-gradient-to-b from-[var(--gold-bright)] to-[var(--gold)] text-[var(--obsidian)]"
              : "text-muted-foreground border border-dashed border-[var(--line-strong)] bg-black/20",
          )}
        >
          {organizer ? initials(orgName ?? "") || "?" : "?"}
        </span>
        <span className="min-w-0 flex-1 leading-none">
          <span className="font-display block truncate text-[16px] font-semibold">
            {orgName ?? "— bez organizátora —"}
          </span>
          <span className="text-muted-foreground mt-px block font-sans text-[9px] tracking-[0.12em] uppercase">
            doprovod
          </span>
        </span>
        <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
          {pairs}/{box.lines.length} párů
        </span>
        <button
          type="button"
          onClick={onRemoveBox}
          title="Zrušit doprovod"
          aria-label={
            orgName ? `Zrušit doprovod — ${orgName}` : "Zrušit doprovod"
          }
          className="text-muted-foreground hover:text-red hover:bg-red-bg shrink-0 rounded-lg p-1 text-base"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {box.lines.map((line, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_18px] items-stretch gap-[5px]"
          >
            <Slot
              boxId={box.id}
              lineIndex={i}
              kind="room"
              value={
                line.room
                  ? { label: roomLabel(line.room), itemId: line.room }
                  : null
              }
              activeKind={activeKind}
              onClear={() => onClearSlot(i, "room")}
            />
            <Slot
              boxId={box.id}
              lineIndex={i}
              kind="player"
              value={
                line.player
                  ? { label: playerLabelOf(line.player), itemId: line.player }
                  : null
              }
              activeKind={activeKind}
              onClear={() => onClearSlot(i, "player")}
            />
            <button
              type="button"
              onClick={() => onRemoveLine(i)}
              aria-label="Odebrat řádek"
              className="text-muted-foreground hover:text-red hover:bg-red-bg rounded-[7px] text-[15px]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "border-border mt-2 rounded-[10px] border border-dashed p-2 text-center text-[11px] tracking-[0.04em] italic",
          isOver ? "text-gold-bright border-primary" : "text-muted-foreground",
        )}
      >
        přetáhněte sem pokoj / hráče → nový řádek
      </div>
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────────
export function KonklaveBuilder({
  rooms,
  players,
  organizers,
  mode = "create",
  initialBoxes,
  konklaveId,
  onCancel,
}: {
  rooms: Room[];
  players: Player[];
  organizers: Organizer[];
  // "create" (default) runs the two-phase reveal that starts a new konkláve;
  // "edit" seeds the builder from an existing konkláve's placements and saves
  // back into it in place (preserving progress) via replaceKonklavePlacements.
  mode?: "create" | "edit";
  initialBoxes?: Box[];
  konklaveId?: string;
  onCancel?: () => void;
}) {
  const isEdit = mode === "edit";
  // Two-phase reveal (create): phase 1 shows a compact call-to-action card;
  // clicking it opens the organizer-selection modal, and confirming there seeds
  // one doprovod per chosen organizer and reveals the full drag-and-drop builder
  // (phase 2). Edit mode skips both phases: the builder opens straight away with
  // the boxes seeded from the active konkláve's current arrangement.
  const [open, setOpen] = useState(isEdit);
  const [modalOpen, setModalOpen] = useState(false);
  // "create" (phase-1 CTA) seeds/replaces boxes and reveals the builder; "add"
  // (phase-2 trigger) appends boxes for the chosen free organizers in place. The
  // same organizer-selection Dialog drives both, switching list source, confirm
  // handler and label by mode.
  const [modalMode, setModalMode] = useState<"create" | "add">("create");
  // Selected organizer ids, kept in selection order so the seeded boxes line up.
  const [selected, setSelected] = useState<string[]>([]);
  const [boxes, setBoxes] = useState<Box[]>(isEdit ? (initialBoxes ?? []) : []);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  // Start the id sequence past the highest seeded box id so a "+ Nový doprovod"
  // in edit mode never collides with an already-seeded box.
  const [boxSeq, setBoxSeq] = useState(() =>
    isEdit
      ? (initialBoxes ?? []).reduce((max, b) => {
          const n = Number(b.id.slice(1));
          return Number.isFinite(n) && n > max ? n : max;
        }, 0)
      : 0,
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Lookups + used-id sets (derived → strict 1:1: a used room/player vanishes
  // from its source column and can't be dragged twice).
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );
  const orgById = useMemo(
    () => new Map(organizers.map((o) => [o.id, o])),
    [organizers],
  );

  const usedRooms = useMemo(
    () =>
      new Set(
        boxes.flatMap((b) =>
          b.lines.map((l) => l.room).filter((x): x is string => !!x),
        ),
      ),
    [boxes],
  );
  const usedPlayers = useMemo(
    () =>
      new Set(
        boxes.flatMap((b) =>
          b.lines.map((l) => l.player).filter((x): x is string => !!x),
        ),
      ),
    [boxes],
  );
  const freeRooms = rooms.filter((r) => !usedRooms.has(r.id));
  const freePlayers = players.filter((p) => !usedPlayers.has(p.id));

  const anyPair = boxes.some((b) => b.lines.some((l) => l.room && l.player));

  // Organizers not yet backing a box. When none are free, every organizer
  // already has a doprovod → the "+ Nový doprovod" triggers are hidden (not
  // merely disabled) and the "add" modal would list nothing.
  const usedOrgIds = new Set(
    boxes.map((b) => b.organizerId).filter((x): x is string => !!x),
  );
  const freeOrganizers = organizers.filter((o) => !usedOrgIds.has(o.id));
  const someFreeOrg = freeOrganizers.length > 0;

  // ── Organizer-selection modal ────────────────────────────────────────────────
  // Phase-1 CTA opens the modal in "create" mode (lists ALL organizers) with a
  // fresh (empty) selection.
  function openOrganizerModal() {
    setModalMode("create");
    setSelected([]);
    setModalOpen(true);
  }

  // Phase-2 trigger opens the SAME modal in "add" mode (lists only free
  // organizers) with a fresh selection; confirming appends boxes in place.
  function openAddModal() {
    setModalMode("add");
    setSelected([]);
    setModalOpen(true);
  }

  function toggleOrganizer(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // "Další" (create): seed one doprovod box per selected organizer (in selection
  // order), keeping box ids consistent with manually-added ones, then reveal the
  // builder.
  function confirmOrganizers() {
    const seeded: Box[] = selected.map((organizerId, i) => ({
      id: `b${i + 1}`,
      organizerId,
      lines: [],
    }));
    setBoxes(seeded);
    setBoxSeq(seeded.length);
    setModalOpen(false);
    setOpen(true);
  }

  // "Přidat" (add): append one empty doprovod box per selected (free) organizer,
  // in selection order, advancing boxSeq so ids never collide with existing or
  // seeded boxes. Stays in the builder (does not touch `open`).
  function confirmAdd() {
    const added: Box[] = selected.map((organizerId, i) => ({
      id: `b${boxSeq + i + 1}`,
      organizerId,
      lines: [],
    }));
    setBoxes((prev) => [...prev, ...added]);
    setBoxSeq((n) => n + selected.length);
    setModalOpen(false);
  }

  // ── State ops ───────────────────────────────────────────────────────────────
  // Drop on a box body → push a new line carrying the dragged value.
  function placeOnBox(boxId: string, kind: "room" | "player", itemId: string) {
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? {
              ...b,
              lines: [
                ...b.lines,
                kind === "room"
                  ? { room: itemId, player: null }
                  : { room: null, player: itemId },
              ],
            }
          : b,
      ),
    );
  }

  // Drop on a specific line's matching slot → replace that slot's value.
  function placeOnSlot(
    boxId: string,
    lineIndex: number,
    kind: "room" | "player",
    itemId: string,
  ) {
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? {
              ...b,
              lines: b.lines.map((l, i) =>
                i === lineIndex ? { ...l, [kind]: itemId } : l,
              ),
            }
          : b,
      ),
    );
  }

  // Clearing a slot returns the item to its column; a now-empty line is pruned.
  function clearSlot(
    boxId: string,
    lineIndex: number,
    kind: "room" | "player",
  ) {
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? {
              ...b,
              lines: b.lines
                .map((l, i) => (i === lineIndex ? { ...l, [kind]: null } : l))
                .filter((l) => l.room || l.player),
            }
          : b,
      ),
    );
  }

  function removeLine(boxId: string, lineIndex: number) {
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? { ...b, lines: b.lines.filter((_, i) => i !== lineIndex) }
          : b,
      ),
    );
  }

  function removeBox(boxId: string) {
    setBoxes((prev) => prev.filter((b) => b.id !== boxId));
  }

  // Move an already-placed item to a new target in ONE atomic update. Target
  // resolution mirrors a source-column drop (matching line slot → that slot; a
  // box body or a slot of the other kind → a new line). The origin slot is then
  // vacated and any line left fully empty is pruned. Crucially, the origin and
  // target lines are captured by object reference before anything mutates, so a
  // same-box prune can never shift the target line's index out from under us.
  function moveItem(
    kind: "room" | "player",
    itemId: string,
    from: { boxId: string; lineIndex: number },
    target: DropTarget,
  ) {
    // No-op: dropped straight back onto its own origin slot.
    if (
      target.type === "slot" &&
      target.kind === kind &&
      target.boxId === from.boxId &&
      target.lineIndex === from.lineIndex
    ) {
      return;
    }
    setBoxes((prev) => {
      // Clone boxes + lines so we can mutate references safely.
      const next = prev.map((b) => ({
        ...b,
        lines: b.lines.map((l) => ({ ...l })),
      }));
      const targetBox = next.find((b) => b.id === target.boxId);
      if (!targetBox) return prev;
      // Capture the origin line by reference BEFORE any push/prune.
      const originLine = next.find((b) => b.id === from.boxId)?.lines[
        from.lineIndex
      ];
      if (target.type === "slot" && target.kind === kind) {
        const targetLine = targetBox.lines[target.lineIndex];
        if (!targetLine) return prev;
        // Overwrites any current occupant; the displaced id simply stops being
        // "used" and so returns to its source column automatically.
        targetLine[kind] = itemId;
      } else {
        // Box body (or a slot of the other kind) → a new line.
        targetBox.lines.push(
          kind === "room"
            ? { room: itemId, player: null }
            : { room: null, player: itemId },
        );
      }
      // Vacate the origin (target line already captured/placed above).
      if (originLine) originLine[kind] = null;
      // Prune lines left fully empty (e.g. the vacated origin line).
      for (const b of next) {
        b.lines = b.lines.filter((l) => l.room || l.player);
      }
      return next;
    });
  }

  // ── DnD ───────────────────────────────────────────────────────────────────
  function onDragStart(e: DragStartEvent) {
    setActiveDrag((e.active.data.current as DragData) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as DragData | undefined;
    if (!data) return;
    const o = over.data.current as DropTarget | undefined;
    if (!o) return;
    // Relocating an already-placed item (drag data carries its origin).
    if (data.from) {
      moveItem(data.kind, data.itemId, data.from, o);
      return;
    }
    // Placing from a source column (unchanged original behavior).
    if (o.type === "slot" && o.kind === data.kind) {
      placeOnSlot(o.boxId, o.lineIndex, data.kind, data.itemId);
    } else {
      // Box body, or a slot of the other kind → new line in that box.
      placeOnBox(o.boxId, data.kind, data.itemId);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  // Create → start a new konkláve; edit → replace the active konkláve's
  // placements in place (same assignment shape either way).
  function start() {
    setError("");
    const assignments = boxes.flatMap((b) =>
      b.lines
        .filter((l) => l.player)
        .map((l) => ({
          playerId: l.player as string,
          roomId: l.room,
          organizerProfileId: b.organizerId,
        })),
    );
    startTransition(async () => {
      const res =
        isEdit && konklaveId
          ? await replaceKonklavePlacements({ konklaveId, assignments })
          : await startKonklave({ assignments });
      if (res.error) setError(res.error);
      else {
        router.refresh();
        // Edit mode: leave the builder so active-konklave.tsx shows the
        // read-only cards again (create mode stays put and reveals the new
        // active konkláve on refresh).
        if (isEdit) onCancel?.();
      }
    });
  }

  const dragLabel = activeDrag
    ? activeDrag.kind === "room"
      ? (roomById.get(activeDrag.itemId)?.name ?? "")
      : playerLabel(
          playerById.get(activeDrag.itemId) ?? {
            id: "",
            name: "",
            nickname: null,
          },
        )
    : "";

  // ── Organizer-selection Dialog (shared by both phases) ───────────────────────
  // One renderer, driven by `modalMode`: "create" lists ALL organizers and
  // confirms via confirmOrganizers (seed + reveal); "add" lists only the free
  // organizers and confirms via confirmAdd (append in place). The checkbox-list
  // markup is written once here so neither phase duplicates it.
  const isAdd = modalMode === "add";
  const dialogOrganizers = isAdd ? freeOrganizers : organizers;
  function renderOrganizerDialog() {
    return (
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vyberte organizátory</DialogTitle>
            <DialogDescription>
              Pro každého vybraného organizátora vznikne jeden doprovod.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
            {dialogOrganizers.length === 0 ? (
              <p className="text-muted-foreground px-1 py-3.5 text-center text-sm italic">
                — žádní organizátoři —
              </p>
            ) : (
              dialogOrganizers.map((o) => {
                const checked = selected.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-[var(--panel-2)] px-3 py-2 transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary border-[var(--line-strong)]",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOrganizer(o.id)}
                    />
                    <span className="font-display text-[16px] font-semibold">
                      {orgLabel(o)}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              onClick={isAdd ? confirmAdd : confirmOrganizers}
              disabled={selected.length === 0}
            >
              {isAdd ? "Přidat" : "Další"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Phase 1: compact call-to-action + organizer-selection modal ──────────────
  if (!open) {
    return (
      <>
        <Card className="mx-auto max-w-[440px] items-center gap-4 p-6 text-center">
          <div>
            <div className="font-display text-[22px] font-semibold">
              Nové konkláve
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Žádné aktivní konkláve. Založte nové a rozmístěte hráče do pokojů.
            </p>
          </div>
          <Button type="button" onClick={openOrganizerModal}>
            Založit konkláve
          </Button>
        </Card>

        {renderOrganizerDialog()}
      </>
    );
  }

  // ── Phase 2: full drag-and-drop builder ─────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      {/* Action row */}
      <div className="border-border mb-[18px] flex flex-wrap items-end gap-3 border-b pb-4">
        <div className="min-w-[220px] flex-1">
          <div className="font-display text-[22px] font-semibold">
            {isEdit ? "Úprava konkláve" : "Příprava konkláve"}
          </div>
          <p className="text-muted-foreground mt-1 text-[12px]">
            Sestavte doprovody — přetáhněte pokoj a hráče na organizátora.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isEdit && onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={pending}
            >
              Zrušit
            </Button>
          ) : null}
          {someFreeOrg ? (
            <Button type="button" variant="outline" onClick={openAddModal}>
              + Nový doprovod
            </Button>
          ) : null}
          <Button type="button" onClick={start} disabled={!anyPair || pending}>
            {pending
              ? isEdit
                ? "Ukládám…"
                : "Spouštím…"
              : isEdit
                ? "Uložit rozmístění"
                : "Spustit konkláve"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive mb-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {/* Strip layout: palette (rooms + players) on top, canvas below */}
      <div className="flex flex-col gap-2.5">
        {/* Palette strip — two wrapping rows, capped height */}
        <div className="border-border rounded-[var(--radius)] border bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] px-3 py-2 shadow-[var(--shadow)]">
          <div className="flex items-start gap-3">
            <div className="flex min-h-[32px] w-[120px] shrink-0 items-center gap-2 border-l-[3px] border-l-[var(--gold)] pl-2.5">
              <span className="font-display flex-1 text-[16px] font-semibold">
                Pokoje
              </span>
              <span className="font-display text-gold-bright min-w-[22px] rounded-full border border-[var(--line-strong)] bg-[var(--panel-2)] px-[7px] py-px text-center text-[12px] font-bold tabular-nums">
                {freeRooms.length}
              </span>
            </div>
            <div className="flex max-h-[76px] flex-1 flex-wrap content-start gap-1.5 overflow-auto">
              {freeRooms.length > 0 ? (
                freeRooms.map((r) => (
                  <SourceChip key={r.id} kind="room" item={r} />
                ))
              ) : (
                <span className="text-muted-foreground px-0.5 py-1.5 text-[11px] italic">
                  — všechny pokoje zařazeny —
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-start gap-3 border-t border-[var(--line)] pt-2">
            <div className="flex min-h-[32px] w-[120px] shrink-0 items-center gap-2 border-l-[3px] border-l-[var(--green)] pl-2.5">
              <span className="font-display flex-1 text-[16px] font-semibold">
                Hráči
              </span>
              <span className="font-display text-gold-bright min-w-[22px] rounded-full border border-[var(--line-strong)] bg-[var(--panel-2)] px-[7px] py-px text-center text-[12px] font-bold tabular-nums">
                {freePlayers.length}
              </span>
            </div>
            <div className="flex max-h-[76px] flex-1 flex-wrap content-start gap-1.5 overflow-auto">
              {freePlayers.length > 0 ? (
                freePlayers.map((p) => (
                  <SourceChip key={p.id} kind="player" item={p} />
                ))
              ) : (
                <span className="text-muted-foreground px-0.5 py-1.5 text-[11px] italic">
                  — všichni hráči zařazeni —
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Canvas — doprovod boxes in an auto-fill grid */}
        <div className="border-border rounded-[var(--radius)] border border-l-[3px] border-l-[var(--oxblood-soft)] bg-gradient-to-b from-[var(--charcoal)] to-[var(--obsidian)] px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="font-display text-[18px] font-semibold">
              Doprovody
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] [align-content:start] items-start gap-2.5">
            {boxes.map((b) => {
              const organizer = b.organizerId
                ? (orgById.get(b.organizerId) ?? null)
                : null;
              return (
                <BoxCard
                  key={b.id}
                  box={b}
                  organizer={organizer}
                  roomLabel={(id) => roomById.get(id)?.name ?? "?"}
                  playerLabelOf={(id) => {
                    const p = playerById.get(id);
                    return p ? playerLabel(p) : "?";
                  }}
                  activeKind={activeDrag?.kind ?? null}
                  onClearSlot={(lineIndex, kind) =>
                    clearSlot(b.id, lineIndex, kind)
                  }
                  onRemoveLine={(lineIndex) => removeLine(b.id, lineIndex)}
                  onRemoveBox={() => removeBox(b.id)}
                />
              );
            })}
            {someFreeOrg ? (
              <button
                type="button"
                onClick={openAddModal}
                className="font-display text-muted-foreground hover:text-gold-bright grid min-h-[60px] place-items-center rounded-[var(--radius)] border border-dashed border-[var(--line-strong)] bg-[var(--gold)]/[0.03] text-[16px] transition-colors hover:border-[var(--gold)] hover:bg-[var(--gold)]/[0.06]"
              >
                + Nový doprovod
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-[18px] text-xs leading-relaxed">
        Přetáhněte <b className="text-muted-foreground">pokoj</b> nebo{" "}
        <b className="text-muted-foreground">hráče</b> na doprovod → vznikne
        nový řádek. Pustíte-li na existující řádek, hodnotu nahradíte. Každý
        pokoj i hráč lze použít jen jednou. Jeden organizátor = jeden doprovod;
        přes „+ Nový doprovod“ vyberete organizátory, kterým doprovod vznikne.
        Nezařazení hráči zůstanou „bez místnosti“.
      </p>

      <DragOverlay>
        {activeDrag ? (
          <ChipPreview kind={activeDrag.kind} label={dragLabel} />
        ) : null}
      </DragOverlay>

      {renderOrganizerDialog()}
    </DndContext>
  );
}
