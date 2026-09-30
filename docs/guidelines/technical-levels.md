# Technical Levels & Decision Policy — reference (shared / committed)

This project has a **technical level** that controls, for every session (setup and ongoing development):
**(a)** how technical Claude's responses are, and **(b)** when Claude proceeds with a recommended default vs.
asks the user to choose.

## Per-user — NOT shared via git
The level is **personal to each contributor**. On a shared repo, everyone picks their own. The *active* level
and the auto-resolved choices are stored in **`.claude/tech-level.local.md`**, which is **git-ignored** (never
pushed). This committed file only defines the *options*; it holds no one's active setting.

- **New contributor, no level yet:** if `.claude/tech-level.local.md` does not exist, no level is set — run
  `/project-architect-tech-level` to pick one; it creates the file. Do not assume a level.
- **Change the level:** only with `/project-architect-tech-level` (menu + confirm), so it can't happen by
  mistake — never from chat phrasing.
- **Manage auto-resolved decisions:** with `/project-architect-autoresolve`, or the inline "remember my
  choice" option below.

## The six levels
| # | Level | Response style | When to ask vs. proceed |
|---|---|---|---|
| 1 | Non-programmer | plain language, no jargon, no code unless asked | almost never ask; use the recommended default silently |
| 2 | Junior | technical + explain the why; short commented code | ask on architectural/hard-to-reverse; default the rest and say what you picked |
| 3 | Mid | technical, concise; assume stack knowledge | ask on real trade-offs with no clear winner; default routine choices |
| 4 | Senior | terse, peer-level, no fundamentals | ask only on high-impact/opinion-driven/cross-cutting choices |
| 5 | In control | technical, option-oriented | ask on ANY choice with >1 reasonable approach — never assume |
| 6 | Learning | technical + teaching (knowledge ≈ junior) | ask on ANY choice (like 5) AND explain it as a lesson |

## Level blocks
When a level is set (initially, or via `/project-architect-tech-level`), the block for the chosen level is
written into `.claude/tech-level.local.md` between `<!-- tech-level:start -->` and `<!-- tech-level:end -->`.

### 1 — Non-programmer
**Current level:** Non-programmer. Use plain, non-technical language; avoid jargon (or define it in one short
line). Describe things by what they do for the user, not how they're implemented. Don't show code unless asked.
**Decisions:** make every technical/implementation decision yourself using the recommended default — do NOT
surface choices like `useState` vs `useReducer` or API route structure. Only pause to ask when a choice
changes what the product *does*, its cost, or its timeline, phrased in plain terms. If the user says "let me
choose", present the options simply with your recommendation.

### 2 — Junior developer
**Current level:** Junior developer. Be technical but explain the *why*; briefly define patterns you
introduce. Include short, commented code.
**Decisions:** make routine implementation decisions yourself, but state what you picked and a one-line reason
so the user learns (e.g. "used `useState` — single value; `useReducer` would be overkill"). ASK on
architectural or hard-to-reverse decisions (database, auth model, public API shape, adding an external
service). Don't ask about small idiomatic choices — choose and explain them.

### 3 — Mid-level developer
**Current level:** Mid-level developer. Be technical and concise; assume working knowledge of the stack.
Explain only non-obvious trade-offs.
**Decisions:** proceed on routine and idiomatic choices (hook selection, standard route shapes, naming)
without asking — mention notable ones in passing. ASK when a decision has genuine trade-offs with no clear
winner or meaningful downstream impact (data-model shape, sync vs. queued work, pagination style, caching).

### 4 — Senior developer
**Current level:** Senior developer. Be terse and peer-level; high signal, skip fundamentals; precise
terminology.
**Decisions:** proceed on nearly everything, including routing, hooks, and error handling, without commentary.
ASK only on high-impact, opinion-driven, or cross-cutting/architecturally-significant decisions, presented
compactly with a recommendation. Assume the user will push back if they disagree.

### 5 — I want to be in control of everything
**Current level:** Full control. Be technical and option-oriented; lay out the alternatives.
**Decisions:** ALWAYS ask before choosing whenever something is unclear or can be done in more than one
reasonable way — including small choices (`useState` vs `useReducer`, nested vs flat routing, file/folder
naming, library selection). Never assume a default. Present each fork as: the options, their trade-offs, and
your recommendation — then wait. Batch closely-related micro-decisions into one prompt, but do not skip any.

### 6 — Learning
**Current level:** Learning (knowledge ≈ junior; goal is to UNDERSTAND choices, not just ship). Treat the
project as a series of learning lessons. Be technical but explanatory; define terms and patterns; use short,
commented code.
**Decisions:** like full-control — ALWAYS ask whenever something is unclear or can be done in more than one
reasonable way, including small choices. Never assume a default. **Present every fork as a teaching lesson,**
not just a pick-one prompt. For each decision include: **why it is a decision at all** (what problem forces
it); **the options** and what each actually means; **benefits and disadvantages of each, and why someone
would pick each**; **why these options exist** (the underlying concept/pattern); and **your recommendation**
for this project and why. Then wait for the user's decision. Keep each lesson focused; batch tightly-related
micro-decisions into one lesson, but never skip a choice — surfacing and explaining choices IS the point.

## Decision & auto-resolve model (how "remember my choice" works)
This governs how Claude presents any decision, at every level. It operates on the registry stored in the
per-user `.claude/tech-level.local.md`.

Whenever Claude presents a decision to the user, it adds one **extra option at the end** of the choices:
> *"Let me choose, and next time use the same choice."*

- If the user picks a **normal option** → apply it this once; do **not** save it.
- If the user picks the **extra "remember" option** → then let them pick among the normal options, apply that,
  and **save** it to the Auto-resolved decisions table in `.claude/tech-level.local.md` so this decision is not
  asked again.

Before asking about any decision, Claude first checks that table: if there's a saved choice for it, apply that
**silently without asking** — **unless** the user explicitly asks to decide it again. When the user asks to
re-decide a saved decision, Claude presents it again (including the extra "remember" option): if the user
picks the "remember" option, **overwrite** the saved value; if they don't, leave the saved value unchanged
(their pick is a one-off). Direct edits to saved choices are done via `/project-architect-autoresolve`.
