import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";

// The authenticated Supabase user (identity), or null.
// Wrapped in React's cache() so the getUser network round-trip is deduped
// across layout + page within a single server request (first call does the
// real work; later calls in the same render reuse the stored value).
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// The current user's profile row (email + role), or null if not logged in.
// Also cache()-wrapped so the profile lookup runs once per request and is
// reused across layout + page in the same render.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  return profile ?? null;
});

// True if the current user's profile has the admin role. Used to gate
// admin-only UI (cosmetic) and server actions (defense in depth).
export async function isAdmin(): Promise<boolean> {
  const p = await getProfile();
  return p?.role === "admin";
}

// Redirects to /login if not authenticated. Returns the authenticated user.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// Redirects to /login if not authenticated, or to / if not an admin.
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");
  return profile;
}
