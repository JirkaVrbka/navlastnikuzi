# Testing Conventions

- **TDD:** no production code before a failing test exists (red → green → refactor). This matters most for
  `lib/domain/` (delay math, vote/elimination rules) — write the behaviour first.
- **Behaviour-named tests:** `posouvá pozdější události o zpoždění` / `returns 404 when order is missing`,
  not `test_get`.
- Test services/behaviour, not framework glue; mock external deps only.
- One logical assertion per test; no shared mutable state.
- Apply SOLID/DRY at the **refactor** step; Rule of Three before abstracting.
- **Unit (Vitest):** `npm test` (watch: `npm run test:watch`). Pure domain logic needs no DB or browser.
- **E2E (Playwright):** `npm run test:e2e` — cover the risky flows end to end: delay propagation across a day,
  a full voting round (create → ±votes → end → eliminate → archive), and login/auth-gating.
