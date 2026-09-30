# Architecture Decision Records

ADRs capture decisions that are **hard to reverse AND surprising without context AND a real trade-off**.
Skip trivial/obvious choices. File: `docs/guidelines/adr/NNNN-short-kebab-title.md` (increment NNNN).

Likely early ADRs for this project: the delay-propagation model, voting↔player elimination ownership,
auth model (Supabase email+password, admin-seeded), and how MCP is layered on later.

## ADR template

```markdown
# NNNN — <Title>
- Date: <YYYY-MM-DD>  ·  Status: proposed|accepted|superseded  ·  Deciders: <who>

## Context

## Options considered
- A — …
- B — …

## Decision

## Consequences
- Positive:
- Negative:
- Risks:

## Related
```
