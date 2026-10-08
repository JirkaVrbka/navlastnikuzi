# Design Brief: Banka (Bank Management)

## Problem

During a live Traitors game the organizer needs to track the money the group earns from missions:
how much each mission actually paid out, and how much it _could_ have paid. Right now there is no
place to record this. The organizer is juggling a phone one-handed and needs the running total at a
glance, plus the ability to fix a typo'd amount without friction.

## Solution

A single **Banka** screen (new bottom tab, organizer-only, one global bank). The eye lands first on
the big running total of all mission profits. Just beneath, quieter, sits the "unrealized potential"
number — how much was left on the table. Below that, a reverse-chronological ledger of every mission
entry, each stamped with its creation time, each editable and deletable. Adding an entry is a single
tap → a focused modal with three fields.

## Experience Principles

1. **One number first** — the summary (Σ zisk) is the hero; everything else is support. The screen
   answers "how much do we have?" before the organizer finishes looking.
2. **Fix without fear** — editing or deleting an entry is one tap away and never punishing; a live
   event means typos happen and must be correctable instantly.
3. **Calm ledger, loud total** — the history is a quiet, scannable list; visual weight is spent on the
   summary, not on per-row chrome.

## Aesthetic Direction

- **Philosophy**: "Cinematic / Traitors manor" — the app's existing dark, token-driven design system.
- **Tone**: Composed, slightly opulent (gold on obsidian), legible under low light / phone glare.
- **Reference points**: The existing Itinerář/Hlasování screens; gold `tabular-nums` counts; serif
  display headings.
- **Anti-references**: No spreadsheet/fintech-dashboard feel, no light mode, no dense data grid, no
  real-banking imagery.

## Existing Patterns

- **Typography**: Cormorant Garamond (`font-display`) for titles & big numeric counts; Jost
  (`font-sans`) for body/labels/inputs. Captions = `text-[11px] tracking-[0.12em] uppercase text-muted-foreground`.
  Numeric amounts use `tabular-nums`, gold.
- **Colors**: tokens only, from `app/globals.css`. `primary`/`gold` = accents & the hero total; `muted-foreground`
  = secondary number & captions; `destructive`/`red` = delete; `card`/`popover` surfaces. No hardcoded hex.
- **Spacing**: phone column `mx-auto w-full max-w-[440px] px-[18px]`; radius `--radius: 1rem`; card
  shadow `shadow-[var(--shadow)]`. No per-page bottom padding (global).
- **Components**: shadcn `Card`, `Dialog`, `Input`, `Label`, `Button` already themed. Shared
  `addButtonClass` (`lib/ui.ts`) for the add affordance. Delete-confirm mirrors
  `app/zpovedi/finish-confession-dialog.tsx`.

## Component Inventory

| Component           | Status | Notes                                                                                                                           |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| BottomTabNav        | Modify | Add 7th tab **💰 Banka → `/banka`**. Verify 360px fit; if crowded, add overflow menu button holding all links (see Responsive). |
| Banka page          | New    | `app/banka/page.tsx` — summary header + add button + history list.                                                              |
| SummaryHeader       | New    | Hero Σ zisk (big serif gold, `tabular-nums`, ` Kč`); below smaller muted Σ potenciál−zisk.                                      |
| Add affordance      | Reuse  | `addButtonClass` from `lib/ui.ts` — "+ Přidat do banky".                                                                        |
| Entry dialog (add)  | New    | shadcn `Dialog` + `Input`/`Label`/`Button`. 3 fields; client+server Zod validation.                                             |
| Entry dialog (edit) | Reuse  | Same form component, prefilled.                                                                                                 |
| Entry row           | New    | Mission name (serif), amount gold `tabular-nums Kč`, creation time caption, edit/delete.                                        |
| Delete confirm      | New    | Mirror `finish-confession-dialog.tsx`; destructive button.                                                                      |

## Key Interactions

- **Add**: tap "+ Přidat do banky" → modal opens, focus on `název mise`. Fields: `název mise` (text,
  required), `zisk` (int ≥ 0, Kč, required), `potenciál` (int ≥ 0, optional). On submit: if `potenciál`
  empty → set = `zisk`; validate `potenciál ≥ zisk` (else inline error on the field). Save → modal
  closes, new entry appears at top of list, both summary numbers update.
- **Edit**: tap an entry (or its edit control) → same modal prefilled → save updates row + summary.
- **Delete**: tap delete → confirm modal naming the mission → confirm removes row + updates summary.
- **Summary**: always reflects current entries. Σ zisk = sum of all `zisk`. Secondary = Σ potenciál −
  Σ zisk (≥ 0 by the `potenciál ≥ zisk` rule). Empty bank → both show `0 Kč` + a calm empty state.
- **Feedback**: amounts right-aligned, `tabular-nums` so columns don't jitter when numbers change.

## Responsive Behavior

- Single phone column, works 360–440px, no horizontal scroll.
- **Nav fit**: this makes **7 tabs**. The design system currently documents 6 fitting at 360px with
  `gap-1`/`text-[10px]`/`min-w-0`. 7 must be verified at 360px during build. **If it breaks fit, do NOT
  shrink** — instead introduce an overflow **menu button** in the bar that opens a list of all links
  (keeps every destination reachable). Only fall back to the menu if 7 genuinely does not fit.
- Modal: full-width within the phone column, fields stacked, tap targets ≥ 44px.

## Accessibility Requirements

- Tap targets ≥ 44px on add/edit/delete controls and nav tab.
- Text/contrast per existing tokens (ink on obsidian/panel already AA).
- Dialog: focus trap + focus to first field on open, Esc closes, focus returns to trigger (shadcn
  `Dialog` default). Number inputs labelled; inline validation error tied to its field via `aria`.
- Active nav tab carries `aria-current="page"` (existing).
- Respect `prefers-reduced-motion` (global).

## Out of Scope

- Per-event / per-day banks, multiple banks, categories/tags.
- Real currency math (FX, decimals/haléře) — integers only, Kč suffix only.
- Player/konkláve/voting integration — the bank is standalone.
- Charts, trends, export, undo/history-of-edits, audit log.
- Any player-facing view or auth change beyond organizer-only.
