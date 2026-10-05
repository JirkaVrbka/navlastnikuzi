// Vitest stub for the `server-only` marker module. In a Next.js build this module
// is provided by the framework and throws if imported into a Client Component; it
// does NOT resolve under plain Node/Vitest. Server-only guarantees are still
// enforced at build time — this alias only lets server modules (e.g.
// lib/supabase/admin.ts, lib/services/users.ts) load inside unit/integration
// tests. Intentionally empty.
export {};
