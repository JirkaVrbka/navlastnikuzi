# Design Brief: Rekvizity (props catalog + event linking)

## Problem

An organizer preparing a Traitors-style LARP has to bring real-world props (candles, masks, a goblet, ballots…).
Today each event just lists props as loose free text, retyped per event with no spelling consistency and no shared
picture of what the group actually owns. The organizer cannot answer basic questions — "which props do we own and
how many?", "did I already pack this?", "is this prop something we have, or do we still need to source it?" — and a
prop that only ever exists as a typo inside one event silently falls through the cracks.

## Solution

A single **Rekvizity catalog**: one page that lists every prop the group tracks, with how many they own, whether
they have it, and a note. When building an event, the organizer picks props from this catalog (the same muscle
memory as assigning organizers) instead of retyping them — or types a one-off name when it isn't catalogued yet.
In the event detail, any prop that isn't backed by a catalog entry wears a small red "není v katalogu" chip, a
gentle nudge to add it to the master list. The catalog is also reachable by the assistant over MCP, so props can
be managed and linked from chat.

## Experience Principles

1. **Familiar over novel** — reuse the exact linking gesture organizers already use (pick-or-type), so props need
   no new mental model.
2. **Surface the gap, don't block** — free-text props still work; the interface flags what's uncatalogued in red
   rather than forcing catalog entry up front.
3. **Phone-first, glanceable** — an organizer reads this one-handed mid-event; state (how many, have it / don't)
   reads at a glance through the same green/red status pills used for players.

## Aesthetic Direction

- **Philosophy**: "Cinematic Traitors manor" — the established app-wide direction (see
  `.claude/.../memory/cinematic-ui-direction.md` and `docs/guidelines/design-system.md`). This feature **extends**
  it, introduces no new look.
- **Tone**: quiet, tactile, confident; candlelit not clinical.
- **Reference points**: the existing Players board (`app/hraci`) and the itinerary event dialog
  (`app/itinerar`) — this should feel like a sibling of those, indistinguishable in styling.
- **Anti-references**: generic light-mode admin CRUD tables; bright utility blue/green; raw Tailwind palette
  colors; spreadsheet density.

## Existing Patterns

Everything here is reused; nothing new is introduced.

- **Typography**: Cormorant Garamond `font-display` for titles/card names/counts; Jost (`font-sans`) for body/UI;
  caption sub-labels `text-[11px] tracking-[0.12em] uppercase text-muted-foreground`; counts `tabular-nums`.
- **Colors (tokens only, from `app/globals.css`)**: `card`/`popover` surfaces, `primary`/`text-gold` for counts
  and accents, `muted-foreground` for notes; status pills reuse `border-green/40 bg-green-bg text-green` ("Máme")
  and `border-red/40 bg-red-bg text-red` ("Nemáme" / "není v katalogu"); errors `text-destructive`. No raw hex, no
  `red-600`/`emerald-*`, no `bg-white`/`text-black`, no light-mode classes.
- **Spacing/shape**: phone column `mx-auto w-full max-w-[440px] px-[18px]`; `--radius: 1rem` → `rounded-lg`/`-xl`,
  pills `rounded-full`; `shadow-[var(--shadow)]` on raised surfaces; no re-added atmosphere layers; no extra bottom
  padding (tab bar handled globally in `app/layout.tsx`).
- **Components**: `Card`, `Dialog`, `Input`, `Textarea`, `Checkbox`, `Button` (incl. `variant="destructive"`) from
  `components/ui/*`; `addButtonClass` (`lib/ui.ts`) for the "+ Přidat" affordance; `Pill` (`app/itinerar/pill.tsx`)
  and the picker structure from `app/itinerar/organizer-picker.tsx`; status-pill classes from
  `app/hraci/player-card.tsx`. Navigation stays the global `components/bottom-tab-nav.tsx` (unchanged) plus a new
  index-page link; Czech strings throughout.

## Component Inventory

| Component                                                     | Status        | Notes                                                                                                                                  |
| ------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `PropsBoard` / `PropCard`                                     | New           | Mirror `players-board.tsx` / `player-card.tsx`: Card, `font-display` name, count (gold `tabular-nums`), Máme/Nemáme status pill, note. |
| `PropDialog` / `PropView` / `PropForm`                        | New           | Mirror `player-dialog`/`player-view`/`player-form`: view↔edit, themed Dialog, destructive delete with confirm.                         |
| `PropPicker`                                                  | New           | Mirror `organizer-picker.tsx` (Input + popover list + `Pill`), pick catalog prop or free text; emits ordered items.                    |
| Red "není v katalogu" chip                                    | New (compose) | The existing red status-pill class placed beside un-catalogued items in `item-checklist.tsx`.                                          |
| Rekvizity index link                                          | Modify        | Add an `outline` `buttonVariants` link in the `app/page.tsx` links block (mirrors the `/hraci` link).                                  |
| `Card`/`Dialog`/`Input`/`Textarea`/`Checkbox`/`Button`/`Pill` | Exists        | Reused as-is; no modification.                                                                                                         |
| Bottom tab bar                                                | Exists        | Unchanged — no new tab (per user: index link only).                                                                                    |

## Key Interactions

- **Catalog CRUD**: tap "+ Přidat rekvizitu" (dashed-gold `addButtonClass`) → themed Dialog form (name, count,
  "Máme" checkbox, note) → save → card appears/updates; tapping a card opens read-only view → "Upravit" flips to
  the form; delete is a `destructive` button behind a `confirm`. Inline validation errors render as
  `text-destructive` under the field; a duplicate name surfaces "Rekvizita s tímto názvem už existuje."
- **Linking in an event**: in the event form, the Rekvizity field is the `PropPicker` — type to filter catalog
  props, Enter / click to add a linked pill, or add a typed free-text pill; remove via the pill's ✕. Order is
  preserved. Mirrors the organizer picker exactly.
- **Red flag**: in the event detail checklist, a linked prop shows normally; an un-catalogued one shows a small red
  "není v katalogu" pill beside its label. The existing checkbox toggle + checked line-through behavior is
  unchanged. Deleting a catalog prop later nulls the link, so previously-linked items re-appear with the red chip.

## Responsive Behavior

Single phone column at every width (`max-w-[440px]`), identical to Players/Itinerary — no breakpoint layout change.
The picker's option list is an absolutely-positioned popover that must stay within the viewport and not cause
horizontal scroll at 360px. Tap targets (add button, pills' remove, checkboxes, dialog buttons) stay ≥44px.

## Accessibility Requirements

- Dark-theme contrast already meets the design-system baseline; the red chip must read on `bg-red-bg` as the
  existing "Vyřazen(a)" chip does (same tokens, so parity is automatic).
- The red chip is not color-only: it carries the text "není v katalogu" (and a `title`), so the state is
  conveyed without relying on hue.
- Picker is keyboard-operable (type, Enter to add, Escape/blur to close, ✕ to remove), focus visible via the gold
  `ring` token; labels bound to inputs (`htmlFor`/`id`); errors use `role="alert"`.

## Out of Scope

Per-event prop quantities (count stays catalog-level); auto-creating catalog entries from free text; photos or
attachments on props; a new bottom-tab (reached via the index link); any restyle of Players/Itinerary beyond the
item-shape/linking/red-chip additions; light mode.
