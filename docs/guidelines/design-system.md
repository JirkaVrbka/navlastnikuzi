# Design System — "Cinematic / Traitors manor"

The single source of truth for how NaVlastniKuzi looks. **Every UI change must follow this** so the
app stays one coherent design. The implemented reference is `app/globals.css` (tokens + atmosphere)
and the visual mockup `resources/style-1-cinematic.html`.

## Principles

- **Dark-only.** There is no light mode and no theme toggle. Never add light-mode styling.
- **Token-driven.** Colors/radius/shadow come from CSS variables in `app/globals.css`, consumed via
  Tailwind utilities and shadcn component tokens. **Never hardcode a hex color in a component** —
  add/extend a token instead.
- **Mobile-first.** Designed for an organizer's phone during a live event: one-handed, legible,
  big tap targets.
- **shadcn first.** Use (and re-theme) shadcn/ui components before hand-building anything.

## Color tokens

All defined in `app/globals.css`. The cinematic palette is mapped onto the standard shadcn tokens,
**plus** a set of raw accent tokens exposed as Tailwind utilities. Use the semantic shadcn token
when one fits; use the accent utilities for the cinematic flourishes.

### Semantic (shadcn) tokens — prefer these

| Token / utility       | Value                   | Use for                                         |
| --------------------- | ----------------------- | ----------------------------------------------- |
| `background`          | `#0c0a0b` (obsidian)    | app base (lives on `<html>`)                    |
| `foreground`          | `#efe7db` (ink)         | default text                                    |
| `card`                | `#1b1512` (panel)       | card surfaces (gradient added by the component) |
| `popover`             | `#221a16` (panel-2)     | dialogs, popovers, dropdowns                    |
| `secondary` / `muted` | `#221a16`               | field backgrounds, subtle chips                 |
| `muted-foreground`    | `#9a9089`               | secondary/sub-label text                        |
| `primary`             | `#c9a264` (gold)        | primary actions; `primary-foreground` `#0c0a0b` |
| `accent`              | `#7b1e22` (oxblood)     | active/selected emphasis                        |
| `destructive`         | `#c76a63` (red)         | danger / eliminations                           |
| `border` / `input`    | `rgba(201,162,100,.14)` | gold hairline borders                           |
| `ring`                | `#c9a264` (gold)        | focus rings                                     |

### Cinematic accent utilities

| Utility                      | Token                    | Value           | Use for                       |
| ---------------------------- | ------------------------ | --------------- | ----------------------------- |
| `text-gold` / `bg-gold`      | `--gold`                 | `#c9a264`       | times, accents, active nav    |
| `text-gold-bright`           | `--gold-bright`          | `#e6c88a`       | brightest accent / hover      |
| `bg-oxblood`                 | `--oxblood`              | `#7b1e22`       | delay / danger emphasis       |
| `*-oxblood-soft`             | `--oxblood-soft`         | `#a03036`       | glows, bullet markers, spines |
| `text-green` / `bg-green-bg` | `--green` / `--green-bg` | `#7fae76` / 14% | "Ve hře" status               |
| `text-red` / `bg-red-bg`     | `--red` / `--red-bg`     | `#c76a63` / 15% | "Vyřazen(a)" status           |

Raw vars also available via arbitrary values: `--charcoal #15110f`, `--panel`, `--panel-2`, `--ink`,
`--line-strong rgba(201,162,100,.26)`, `--shadow`, `--obsidian`.

> **Do not** use `emerald-*`, numbered `green-6xx`/`red-6xx`, `bg-white`, `text-black`, or any raw hex
> in components. Use the tokens above.

## Typography

Loaded via `next/font/google` in `app/layout.tsx`. **Cormorant Garamond's italic is a separate font
instance** (`--font-display-italic`) — a Turbopack workaround; don't recombine normal+italic into one
`next/font` call.

| Role               | Font / utility                                    | Use for                                                                                |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Display / headings | Cormorant Garamond — `font-display`               | view titles (`text-[27px]`), card/dialog titles, event titles, day labels, vote counts |
| Display italic     | Cormorant Garamond italic — `font-display-italic` | the "Na Vlastní Kůži" wordmark (don't also add the `italic` class)                     |
| Body / UI          | Jost — `font-sans` (default)                      | all body text, labels, buttons, inputs                                                 |
| Mono               | Geist Mono — `font-mono`                          | **only** the MCP token display                                                         |

**Sub-labels / captions:** uppercase, tracked, muted — `text-[11px] tracking-[0.12em] uppercase text-muted-foreground`.
**Times & numeric counts:** `tabular-nums`, gold.

## Shape, depth, atmosphere

- **Radius:** `--radius: 1rem` (use `rounded-lg`/`rounded-xl`; pills use `rounded-full`).
- **Shadow:** `shadow-[var(--shadow)]` (`0 18px 44px -20px rgba(0,0,0,.85)`) on cards/raised surfaces.
- **Atmosphere:** fixed, `pointer-events:none`, `z-index:-1` layers on `body::before` (oxblood + gold
  radial glows + bottom vignette) and `body::after` (faint SVG film grain). Defined once in
  `globals.css` — pages must not re-add these.

## Layout & mobile rules

- **Phone column:** wrap page content in `mx-auto w-full max-w-[440px] px-[18px]`.
- **Bottom-bar clearance:** handled globally in `app/layout.tsx` — pages must NOT add their own bottom
  padding for the tab bar.
- **Tap targets ≥44px** on every interactive control (`min-h-11`, `size-11`, etc.).
- **Respect `prefers-reduced-motion`** (globally guarded; don't add always-on motion).
- Works from **360px** wide with no horizontal scroll.

## Navigation

- **Bottom tab bar** (`components/bottom-tab-nav.tsx`) on every screen: 🏠 Domů `/` · 📅 Itinerář
  `/itinerar` · 👥 Hráči `/hraci` · 🗳 Hlasování `/hlasovani` · 🚪 Konkláve `/konklave` · 🕯 Zpověď
  `/zpovedi` · 💰 Banka `/banka`. Active tab = gold with a gold indicator bar; blurred dark surface,
  gold hairline top, `env(safe-area-inset-bottom)`. With **7 tabs** the row uses `gap-1`, `text-[10px]`
  labels and `min-w-0` items; at 360px each item is ~44px wide, so the longest label ("Hlasování")
  may truncate with an ellipsis — the same accepted behavior as at 6 tabs — rather than wrap. All tabs
  stay inline (no overflow menu).
- **Hidden on `/login`** (standalone screen).
- Admin pages (`/uzivatele`, `/mcp-tokeny`) are **not** in the tab bar — link to them from the home
  page, admin-only.

## Component patterns

- **Cards** — shadcn `Card` (panel→charcoal gradient, gold hairline, `--shadow`). Titles use the serif.
- **Buttons** — shadcn `Button`. `default`/`outline`/`secondary`/`destructive` render **UPPERCASE +
  `tracking-[0.08em]`**; `ghost`/`link` stay normal-case. Primary = gold on obsidian; outline = gold
  hairline + gold text.
- **"+ Přidat…" add affordance** — use the shared `addButtonClass` from `lib/ui.ts` (dashed gold,
  full-width). Don't re-copy the class string.
- **Status pill** (player in/out) — inline, `rounded-full` small bordered: in-game
  `bg-green-bg text-green border-green/40` ("Ve hře"); out `bg-red-bg text-red border-red/40`
  ("Vyřazen(a)") with a muted `pořadí #N · {reason}` meta line. (Note: `app/itinerar/pill.tsx` is a
  different _removable-tag_ pill — not the status pill.)
- **Avatars** — radial-gradient circle `radial-gradient(circle at 35% 30%, #2c211a, #140f0c)` with ink
  initials (≤2 letters, else `?`); photo when available; eliminated players desaturated/dimmed.
  Shared behavior in `app/hlasovani/candidate-avatar.tsx`.
- **Event rows** — use the shared `app/itinerar/event-row-content.tsx` (gold tabular `HH:mm–HH:mm`,
  serif title, `· místo`, italic muted `(posunuto +N min)`). The **candle-spine** accent is a `before:`
  gradient on the wrapping element: gold normally, `--oxblood-soft` + `shadow-[0_0_12px_rgba(160,48,54,.5)]`
  when the event is delayed. Both the Itinerář and Home agenda render through this one component.
- **Fields** (input/textarea/select/label) — themed dark (panel-2 bg, gold focus ring, ink text,
  muted placeholder); labels use the caption style above.
- **Dialogs / popovers** — `--popover` surface, gold hairline, `--shadow`.

## Language

UI is **Czech**. Keep all user-facing strings Czech; never change copy during a restyle.

## When adding or changing UI — checklist

1. Reuse an existing themed component/token before creating anything new.
2. No hardcoded colors, no light-mode classes, no new fonts.
3. Phone column + ≥44px tap targets + no horizontal scroll at 360px.
4. Serif for titles, Jost for everything else, mono only for MCP tokens.
5. Nav via the bottom tab bar; don't re-add per-page nav or bottom padding.
6. If you must introduce a color/space value, add a **token** in `globals.css` and document it here.
