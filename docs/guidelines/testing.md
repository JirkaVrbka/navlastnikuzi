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

## E2E isolation — NEVER touch the dev database

E2E tests create and delete real rows, so they run against a **separate Supabase test stack**, never the dev
stack. This keeps hand-created dev data safe.

- The test stack is a second local Supabase instance in `tests-supabase/` on ports **553xx** (dev is 543xx).
  Start/stop it with `npm run supabase:test:start` / `npm run supabase:test:stop`.
- Playwright (`playwright.config.ts`) builds+serves the app on **port 3100** (dev is 3000) with the test
  stack's `DATABASE_URL`/URL in `webServer.env`, so it never reuses the dev app on 3000. `global-setup.ts`
  verifies the test stack is up, then applies migrations + seeds the admin on it (idempotent).
- **Rule:** never run `TRUNCATE`/`DELETE` or any destructive cleanup against the **dev** database
  (`supabase_db_ZradciWeb2`, port 54322). Only the test stack is disposable. If you must reset test data,
  reset the **test** DB (55322) only.
