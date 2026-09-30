# Phase 02 — Auth & users

Roadmap phase 2. Derived from `docs/development/project-definition.md`. Clarified via
`requirements-clarity` (4 decisions confirmed, all recommended options).

## Assignment (what "done" looks like, in plain terms)

Organizers can **log in** with email + password and nobody else can reach the app. There is a **first admin**
(seeded), and the **admin can create more users** (organizers or other admins) from inside the app by setting
their email + password directly. Everyone can **sign out**. All app pages require being logged in; the
user-management page requires being an admin. UI text is in **Czech**.

### Confirmed decisions

1. Role lives in a **`public.profiles`** table (`role` = `admin` | `organizer`), one row per auth user.
2. First admin is created by a **repeatable TS seed script** reading credentials from `.env.local`.
3. Admins create users by **setting email + password directly**, auto-confirmed (no email delivery).
4. **RLS is enabled** on `profiles` from the start (authenticated read; writes only via service-role/trigger).

## Plan (how it's built)

### 1. Data model — first migration

- **Drizzle schema** (`lib/db/schema.ts`): `profiles` table
  - `id uuid PK` → FK `auth.users(id)` on delete cascade
  - `email text not null`
  - `role text not null default 'organizer'` (check: `admin` | `organizer`)
  - `display_name text`
  - `created_at timestamptz not null default now()`
- **Raw-SQL migration** (added alongside the drizzle-generated table DDL, in `lib/db/migrations/`):
  - `handle_new_user()` trigger on `auth.users` → inserts a `profiles` row, reading `role`/`display_name`
    from the new user's `raw_user_meta_data` (default role `organizer`).
  - `alter table profiles enable row level security;`
  - Policy: `authenticated` can `select` all profiles. No insert/update/delete policies → writes happen only
    via the definer trigger and the service-role admin client (which bypasses RLS).
- Apply with `npm run db:generate` + `npm run db:migrate` against local Supabase.

### 2. Supabase auth wiring (`@supabase/ssr`)

- `lib/supabase/client.ts` — browser client (`createBrowserClient`).
- `lib/supabase/server.ts` — server client (`createServerClient` + `cookies()`), for RSC/server actions.
- `lib/supabase/admin.ts` — **server-only** service-role client (for admin.createUser + seed). Never imported
  into client components.
- `lib/supabase/middleware.ts` + root `middleware.ts` — refresh the session cookie and **gate routes**:
  unauthenticated → redirect to `/login`; `/login` and static assets are public.
- `lib/auth.ts` — `getUser()`, `getProfile()`, `requireUser()`, `requireAdmin()` helpers.

### 3. Validation (Zod)

- `lib/validation/auth.ts` — `loginSchema` (email, password) and `createUserSchema` (email, password ≥ 8,
  `role` enum, optional `display_name`). Shared by client form + server action.

### 4. Routes & UI (Czech, shadcn/ui)

- `app/(auth)/login/page.tsx` — login form; server action `signIn` (`signInWithPassword`); Czech labels +
  error ("Nesprávný e-mail nebo heslo").
- `app/page.tsx` — authed landing: "Přihlášen jako {email} ({role})", **Odhlásit se** button (server action
  `signOut`), and, for admins, a link to Uživatelé.
- `app/(app)/uzivatele/page.tsx` — **admin-only** (`requireAdmin`): list profiles + "Vytvořit uživatele"
  form (email, password, display name, role) → server action using the admin client
  (`admin.createUser({ email, password, email_confirm: true, user_metadata: { role, display_name } })`).

### 5. Seed script

- `scripts/seed-admin.ts` — reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env.local` (via dotenv),
  creates the admin through the admin API (`email_confirm: true`, `user_metadata.role = 'admin'`).
  Idempotent (skip if the email already exists). npm script **`seed:admin`** = `tsx scripts/seed-admin.ts`.
- Add `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` placeholders to `.env.example` (real values only in
  `.env.local`).

### 6. Tests

- **Unit (Vitest):** Zod schemas (valid/invalid email + password length, role enum); `requireAdmin`/role
  helper logic with a faked profile.
- **E2E (Playwright):** unauthenticated visit to `/` → redirected to `/login`; seeded admin logs in → lands
  on `/`; wrong password → Czech error; admin creates an organizer → that organizer can log in. (Requires
  local Supabase up + `npm run seed:admin` run first; documented in the test setup.)

## Files (new unless noted)

- `lib/db/schema.ts` (edit), `lib/db/migrations/*` (generated + raw-SQL trigger/RLS)
- `lib/supabase/{client,server,admin,middleware}.ts`, `middleware.ts`, `lib/auth.ts`
- `lib/validation/auth.ts`
- `app/(auth)/login/page.tsx`, `app/page.tsx` (replace default), `app/(app)/uzivatele/page.tsx`
- server actions (co-located `actions.ts` files)
- `scripts/seed-admin.ts`, `package.json` (edit: `seed:admin` script), `.env.example` (edit)
- shadcn components as needed: `input`, `label`, `form`, `card` (via `npx shadcn add`)

## Verification (definition of done)

- `npm run typecheck && npm test && npm run build` all green.
- Manual: with local Supabase up and `npm run seed:admin` run — log in as admin at `/login`; create an
  organizer in Uživatelé; log out; log in as that organizer; confirm a non-admin cannot open Uživatelé; confirm
  an unauthenticated visit to `/` redirects to `/login`.

## Out of scope (later phases)

- Itinerary, players, voting (phases 3–6). No password reset / email flows. No cloud deploy.

## Risks / notes

- Creating a trigger on `auth.users` needs elevated privileges — works locally (postgres superuser); on cloud
  it's applied via migration/SQL editor.
- Service-role key is server-only; guard against importing `lib/supabase/admin.ts` in any client component.
