# Design Brief: Rozmístění u stolu (Table Seating — "Stůl")

## Problem

During a live _Traitors_-style event the 20 players sit around one big rectangular table. Organizers
constantly need to know **who is in which chair** — to call on a seat, to follow who sat next to whom,
to find a player in the room fast. Today that mapping lives only in someone's head or on paper, and it
drifts. There is no single, glanceable source of truth for the physical seating.

## Solution

A single permanent **seating map** screen. It draws the real rectangle table as it sits in the room —
6 chairs down each long side, 4 across each short side, 20 in total — with a fixed, never-edited seat
number (1–20) on every chair. Each occupied chair shows the player's face, name, and number; a dead
player's chair greys out so the living are obvious at a glance. An admin flips into an edit mode to
drop players into chairs, move them, swap two chairs, or clear a chair. There is no history and no
"session" — it is one setup you maintain, exactly like the itinerary.

## Experience Principles

1. **A map, not a form** — the screen reads as the physical table in the room, so an organizer matches
   screen to reality in one glance. Spatial truth beats a tidy list.
2. **Look freely, change deliberately** — viewing is open to every organizer and frictionless;
   changing is admin-only and behind an explicit edit mode, so the map can't drift by accident.
3. **The living stand out** — a dead player keeps their chair but recedes (greyed), so who is still in
   the game is never in question.

## Aesthetic Direction

- **Philosophy**: "Cinematic / Traitors manor" — the app's existing dark-only, candle-lit manor look.
  Reuse it wholesale; introduce nothing new.
- **Tone**: calm, authoritative, a little ceremonial. A seating plan at a grand table — not a spreadsheet.
- **Reference points**: a round-table/placement card at a formal dinner; the app's own Itinerář and
  Hlasování screens (same cards, gold hairlines, serif titles, player avatars).
- **Anti-references**: a dense admin data-grid; anything bright, flat, or "SaaS dashboard"; drag-and-drop
  canvas tools. No light mode, ever.

## Existing Patterns

Grounded in `docs/guidelines/design-system.md` + `app/globals.css` (the single source of truth).

- **Typography**: Cormorant Garamond (`font-display`) for titles / the seat numbers; Jost (`font-sans`)
  for names, labels, buttons. Sub-labels: `text-[11px] tracking-[0.12em] uppercase text-muted-foreground`.
  Seat numbers are numeric → `tabular-nums`, gold.
- **Colors**: tokens only, no hex. `background #0c0a0b`, `card #1b1512`, `popover #221a16`,
  `primary/gold #c9a264`, `accent/oxblood #7b1e22`, `border` gold hairline `rgba(201,162,100,.14)`,
  `ring` gold. Dead-player grey reuses the **eliminated avatar** treatment (desaturated/dimmed), not a
  new color.
- **Spacing / shape**: phone column `mx-auto w-full max-w-[440px] px-[18px]`; `--radius: 1rem`
  (`rounded-xl`, pills `rounded-full`); raised surfaces `shadow-[var(--shadow)]`. Tap targets ≥44px.
  Atmosphere layers are global — do not re-add.
- **Components**: shadcn `Card`, `Button` (uppercase default/outline), `Dialog`, `Input`, `Label`,
  `Popover`, `Skeleton` already themed in `components/ui/`. `components/player-photo.tsx` and the avatar
  pattern in `app/hlasovani/candidate-avatar.tsx` (radial-gradient circle, ≤2-letter initials, photo
  when present, **eliminated = desaturated/dimmed**) are the direct basis for a seat's face. Add
  affordance: shared `addButtonClass` from `lib/ui.ts`. Status pill pattern from the design system if a
  dead marker beyond greying is wanted.
- **Nav**: `components/bottom-tab-nav.tsx` is a **two-row collapsible** bar (primary row: Domů/Itinerář/
  Hráči + toggle; secondary row: the rest). "Stůl" is added to the **secondary** row — visible to all
  organizers (not `adminOnly`).

## Component Inventory

| Component                      | Status | Notes                                                                                                                                                                                                            |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route `app/stul/page.tsx`      | New    | Server component: fetch 20 seats + their players, render the board. Read-only for non-admins.                                                                                                                    |
| `TableBoard`                   | New    | Lays out the rectangle: long edges run **vertical** (6 seats each, left/right), short edges **horizontal** (4 top / 4 bottom). Head label "Bar" on the top short edge. CSS grid, no drag canvas.                 |
| `SeatSlot`                     | New    | One chair: gold `tabular-nums` seat number + face + name. Empty = dashed gold placeholder. Dead = greyed. Tap target ≥44px. In view mode it's static; in edit mode it's a button.                                |
| Seat face (avatar)             | Reuse  | Reuse `player-photo.tsx` / `candidate-avatar.tsx` behavior (photo or initials, eliminated desaturated).                                                                                                          |
| `EditModeToggle`               | New    | Admin-only `Button` that flips the board between view and edit. Hidden entirely for non-admins.                                                                                                                  |
| `PlayerPicker` (assign dialog) | New    | shadcn `Dialog` listing **all unseated players** with a search `Input`; pick one → assigns to the tapped seat.                                                                                                   |
| Filled-seat actions            | New    | On a filled seat in edit mode: **Změnit** (replace), **Vyprázdnit** (clear), **Prohodit** (swap). Dialog or popover menu.                                                                                        |
| Swap flow                      | New    | Tap **Prohodit** → pick a second seat → the two players trade chairs in one action. Tap-select, **not** drag.                                                                                                    |
| Server actions                 | New    | `app/stul/actions.ts`: assign / change / clear / swap, each `requireAdmin` + Zod, then `revalidatePath("/stul")`.                                                                                                |
| Bottom tab "Stůl"              | Modify | Add `{ href: "/stul", label: "Stůl", icon: "🪑" }` to the secondary row of `bottom-tab-nav.tsx`.                                                                                                                 |
| DB `table_seats` + migration   | New    | 20 seeded rows: `seat_number` 1..20 (unique), `player_id` nullable FK → `players`, **unique index on `player_id`**, `ON DELETE SET NULL`. Not in `schema.ts` alone — CHECK/seed via SQL migration like the rest. |

## Key Interactions

- **View (default, everyone).** The board renders the full table; occupied chairs show face + name +
  number, empty chairs show a dashed placeholder with just the number, dead players are greyed. No
  controls beyond the content. Non-admins never see an edit affordance.
- **Enter edit mode (admin only).** Admin taps the edit toggle; chairs become tappable, an exit/hotovo
  control appears. Non-admins: toggle absent.
- **Assign an empty chair.** Tap empty seat → `PlayerPicker` dialog opens with searchable list of all
  **unseated** players → pick → dialog closes, chair fills, saved immediately. A player already seated
  elsewhere does not appear (one seat per player, enforced by the DB unique index).
- **Change / clear a filled chair.** Tap filled seat → small action menu: **Změnit** (re-opens picker),
  **Vyprázdnit** (empties, with a light confirm), **Prohodit**.
- **Swap.** **Prohodit** highlights the board "choose a chair to swap with"; tapping a second chair
  trades the two players (an empty target just moves the player). One action, one save.
- **Feedback & save.** Every change is a server action → `revalidatePath` (save + refresh model, **no
  realtime**). Other organizers see changes on next load / navigation. No undo stack (no history).

## Responsive Behavior

- **Phone-first, 360–440px.** Content in the standard phone column (`max-w-[440px]`). Global bottom-bar
  clearance — no per-page bottom padding.
- **Board layout.** The rectangle is a CSS grid: a top row of 4 chairs, a bottom row of 4 chairs, and a
  central band with a left column of 6 and a right column of 6 flanking the (empty) table interior. On a
  narrow phone the chairs are compact tiles; names truncate with ellipsis rather than wrap, number and
  face always stay visible. No horizontal scroll at 360px.
- **Larger widths.** Same layout, chairs get more breathing room up to the 440px column; the design is
  not meant to sprawl to desktop width (organizer phone is the target).
- **Edit vs view** is a behavior change, not just size: in view mode chairs are non-interactive; in edit
  mode they become ≥44px buttons with focus rings.

## Accessibility Requirements

- All interactive chairs/controls ≥44px tap target; gold focus ring (`ring`) visible on keyboard focus.
- Each seat has an accessible label, e.g. _"Sedadlo 7 — prázdné"_ / _"Sedadlo 7 — Jan Novák"_, and dead
  state announced (_"vyřazen"_) rather than conveyed by grey alone (color is not the only signal).
- Text/!background contrast meets WCAG AA on the dark palette (ink `#efe7db` on panel surfaces); the
  greyed/dead state must stay legible, not washed out below AA.
- `PlayerPicker` dialog uses shadcn `Dialog` focus trap + Esc to close; focus returns to the originating
  seat on close.
- Respect `prefers-reduced-motion` (globally guarded) — no always-on motion on the board.
- Czech throughout; never emit English user-facing strings.

## Out of Scope

- **History / versions / sessions** — one living setup only, no past states, no "finish", no archive.
- **Realtime sync** — save + refresh only; no live push between phones.
- **Player CRUD** — creating, editing, photographing, eliminating, or reviving players stays in the
  Hráči feature. This screen only places existing players into chairs; player status (`inGame`) is read,
  never written here.
- **Variable table shape / seat count** — fixed rectangle, fixed 20 seats (6/6/4/4), bare corners. No
  configurable sizes, no round tables, no adding/removing seats.
- **Editable seat numbers** — numbering is generated (1 = top-left, clockwise) and permanently read-only.
- **Editable head label** — "Bar" is a fixed code constant on the top short edge.
- **Drag-and-drop** — all editing is tap-based (tap seat → action); no drag canvas.
- **Bulk "clear all"** — explicitly excluded; chairs are cleared one at a time.
- **Rich per-seat status** — only the living/dead (greyed) distinction; no notes, drop-order, or vote
  data surfaced on the board.
