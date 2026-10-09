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
import { addButtonClass } from "@/lib/ui";
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
import { startKonklave } from "./actions";

// ── Types ───────────────────────────────────────────────────────────────────
type Room = { id: string; name: string };
type Player = { id: string; name: string; nickname: string | null };
type Organizer = { id: string; email: string; displayName: string | null };

// A line pairs one room with one player (either slot may still be empty while
// composing). A box groups the lines handled by one organizer.
type Line = { room: string | null; player: string | null };
// A box may have no organizer yet — the organizer is chosen manually per box.
type Box = { id: string; organizerId: string | null; lines: Line[] };

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

// Themed dark <select> — same look as the organizer select in placement-row.tsx.
const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-[var(--panel-2)] px-3 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// ── Avatars / icons (match resources/konklave-build-1-columns.html) ───────────
function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display text-gold-bright flex shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[radial-gradient(circle_at_35%_30%,#2c211a,#140f0c)] font-semibold shadow-[inset_0_0_10px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      {initials(name) || "?"}
    </span>
  );
}

function RoomIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--gold)]/10",
        className,
      )}
    >
      🚪
    </span>
  );
}

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
        "text-foreground hover:border-primary focus-visible:ring-ring focus-visible:border-ring flex min-h-11 cursor-grab touch-none items-center gap-2.5 rounded-xl border border-[var(--line-strong)] bg-[var(--panel-2)] px-3 py-2 text-left transition-colors outline-none select-none focus-visible:ring-2 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {kind === "room" ? (
        <RoomIcon className="size-7 text-[15px]" />
      ) : (
        <InitialsAvatar name={label} className="size-[30px] text-[13px]" />
      )}
      <span className="font-display text-[16px] leading-none font-semibold">
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
    <div className="border-primary flex min-h-11 items-center gap-2.5 rounded-xl border bg-[var(--panel-2)] px-3 py-2 shadow-[var(--shadow)]">
      {kind === "room" ? (
        <RoomIcon className="size-7 text-[15px]" />
      ) : (
        <InitialsAvatar name={label} className="size-[30px] text-[13px]" />
      )}
      <span className="font-display text-[16px] leading-none font-semibold">
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
        <RoomIcon className="size-6 rounded-[7px] text-[13px]" />
      ) : (
        <InitialsAvatar name={label} className="size-6 text-[11px]" />
      )}
      <span className="font-display truncate text-[15px] font-semibold">
        {label}
      </span>
    </button>
  );
}

// ── Source column ─────────────────────────────────────────────────────────────
function SourceColumn({
  title,
  accentClass,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  accentClass: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border rounded-[var(--radius)] border bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] p-3.5",
        accentClass,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="font-display flex-1 text-[19px] font-semibold">
          {title}
        </span>
        <span className="font-display text-gold-bright min-w-[26px] rounded-full border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-0.5 text-center text-sm font-bold tabular-nums">
          {count}
        </span>
      </div>
      <div className="flex min-h-[60px] flex-col gap-2">
        {count > 0 ? (
          children
        ) : (
          <div className="text-muted-foreground px-1 py-3.5 text-center text-xs italic">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
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
        "flex min-h-[42px] items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-sm transition-colors",
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
        <span className="text-muted-foreground text-xs italic">
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
  organizers,
  takenByOthers,
  roomLabel,
  playerLabelOf,
  activeKind,
  onChangeOrganizer,
  onClearSlot,
  onRemoveLine,
  onRemoveBox,
}: {
  box: Box;
  organizer: Organizer | null;
  organizers: Organizer[];
  takenByOthers: Set<string>;
  roomLabel: (id: string) => string;
  playerLabelOf: (id: string) => string;
  activeKind: "room" | "player" | null;
  onChangeOrganizer: (organizerId: string | null) => void;
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
        "rounded-[14px] border border-[var(--line-strong)] bg-gradient-to-b from-[var(--panel)] to-[var(--charcoal)] p-3 pb-2.5 transition-shadow",
        isOver &&
          "border-primary shadow-[0_0_0_2px_rgba(201,162,100,0.25)_inset]",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "font-display flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            organizer
              ? "bg-gradient-to-b from-[var(--gold-bright)] to-[var(--gold)] text-[var(--obsidian)]"
              : "text-muted-foreground border border-dashed border-[var(--line-strong)] bg-black/20",
          )}
        >
          {organizer ? initials(orgName ?? "") || "?" : "?"}
        </span>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-muted-foreground font-sans text-[10px] tracking-[0.14em] uppercase">
            organizátor · doprovod
          </span>
          <select
            aria-label="Organizátor doprovodu"
            className={selectClass}
            value={box.organizerId ?? ""}
            onChange={(e) => onChangeOrganizer(e.target.value || null)}
          >
            <option value="">— bez organizátora —</option>
            {organizers.map((o) => (
              <option
                key={o.id}
                value={o.id}
                disabled={takenByOthers.has(o.id)}
              >
                {orgLabel(o)}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
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
            className="grid grid-cols-[1fr_1fr_24px] items-stretch gap-1.5"
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
}: {
  rooms: Room[];
  players: Player[];
  organizers: Organizer[];
}) {
  // Two-phase reveal: phase 1 shows a compact call-to-action card; clicking it
  // opens the organizer-selection modal, and confirming there seeds one
  // doprovod per chosen organizer and reveals the full drag-and-drop builder
  // (phase 2). The builder's own behavior is unchanged once revealed.
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Selected organizer ids, kept in selection order so the seeded boxes line up.
  const [selected, setSelected] = useState<string[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [boxSeq, setBoxSeq] = useState(0);
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

  // ── Organizer-selection modal ────────────────────────────────────────────────
  // Phase-1 CTA opens the modal with a fresh (empty) selection.
  function openOrganizerModal() {
    setSelected([]);
    setModalOpen(true);
  }

  function toggleOrganizer(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // "Další": seed one doprovod box per selected organizer (in selection order),
  // keeping box ids consistent with manually-added ones, then reveal the builder.
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

  // ── State ops ───────────────────────────────────────────────────────────────
  // A new box starts with no organizer — the organizer is picked manually.
  function addBox() {
    setBoxSeq((n) => n + 1);
    setBoxes((prev) => [
      ...prev,
      { id: `b${boxSeq + 1}`, organizerId: null, lines: [] },
    ]);
  }

  function setBoxOrganizer(boxId: string, organizerId: string | null) {
    setBoxes((prev) =>
      prev.map((b) => (b.id === boxId ? { ...b, organizerId } : b)),
    );
  }

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
      const res = await startKonklave({ assignments });
      if (res.error) setError(res.error);
      else router.refresh();
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

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Vyberte organizátory</DialogTitle>
              <DialogDescription>
                Pro každého vybraného organizátora vznikne jeden doprovod.
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
              {organizers.length === 0 ? (
                <p className="text-muted-foreground px-1 py-3.5 text-center text-sm italic">
                  — žádní organizátoři —
                </p>
              ) : (
                organizers.map((o) => {
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
                onClick={confirmOrganizers}
                disabled={selected.length === 0}
              >
                Další
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            Příprava konkláve
          </div>
          <p className="text-muted-foreground mt-1 text-[12px]">
            Sestavte doprovody — přetáhněte pokoj a hráče na organizátora.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button type="button" variant="outline" onClick={addBox}>
            + Nový doprovod
          </Button>
          <Button type="button" onClick={start} disabled={!anyPair || pending}>
            {pending ? "Spouštím…" : "Spustit konkláve"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive mb-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {/* Three columns: Pokoje · Hráči · Doprovody */}
      <div className="grid grid-cols-1 items-start gap-[18px] md:grid-cols-[250px_250px_1fr]">
        <SourceColumn
          title="Pokoje"
          accentClass="border-l-[3px] border-l-[var(--gold)]"
          count={freeRooms.length}
          emptyLabel="— všechny pokoje zařazeny —"
        >
          {freeRooms.map((r) => (
            <SourceChip key={r.id} kind="room" item={r} />
          ))}
        </SourceColumn>

        <SourceColumn
          title="Hráči"
          accentClass="border-l-[3px] border-l-[var(--green)]"
          count={freePlayers.length}
          emptyLabel="— všichni hráči zařazeni —"
        >
          {freePlayers.map((p) => (
            <SourceChip key={p.id} kind="player" item={p} />
          ))}
        </SourceColumn>

        <div className="border-border rounded-[var(--radius)] border border-l-[3px] border-l-[var(--oxblood-soft)] bg-gradient-to-b from-[var(--charcoal)] to-[var(--obsidian)] p-3.5">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="font-display flex-1 text-[19px] font-semibold">
              Doprovody
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            {boxes.map((b) => {
              const organizer = b.organizerId
                ? (orgById.get(b.organizerId) ?? null)
                : null;
              // Organizers chosen by OTHER boxes — disabled in this box's picker
              // so one organizer still maps to exactly one box.
              const takenByOthers = new Set(
                boxes
                  .filter((o) => o.id !== b.id)
                  .map((o) => o.organizerId)
                  .filter((x): x is string => !!x),
              );
              return (
                <BoxCard
                  key={b.id}
                  box={b}
                  organizer={organizer}
                  organizers={organizers}
                  takenByOthers={takenByOthers}
                  roomLabel={(id) => roomById.get(id)?.name ?? "?"}
                  playerLabelOf={(id) => {
                    const p = playerById.get(id);
                    return p ? playerLabel(p) : "?";
                  }}
                  activeKind={activeDrag?.kind ?? null}
                  onChangeOrganizer={(organizerId) =>
                    setBoxOrganizer(b.id, organizerId)
                  }
                  onClearSlot={(lineIndex, kind) =>
                    clearSlot(b.id, lineIndex, kind)
                  }
                  onRemoveLine={(lineIndex) => removeLine(b.id, lineIndex)}
                  onRemoveBox={() => removeBox(b.id)}
                />
              );
            })}
            <button type="button" onClick={addBox} className={addButtonClass}>
              + Nový doprovod
            </button>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-[18px] text-xs leading-relaxed">
        Přetáhněte <b className="text-muted-foreground">pokoj</b> nebo{" "}
        <b className="text-muted-foreground">hráče</b> na doprovod → vznikne
        nový řádek. Pustíte-li na existující řádek, hodnotu nahradíte. Každý
        pokoj i hráč lze použít jen jednou. Jeden organizátor = jeden doprovod.
        Nezařazení hráči zůstanou „bez místnosti“.
      </p>

      <DragOverlay>
        {activeDrag ? (
          <ChipPreview kind={activeDrag.kind} label={dragLabel} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
