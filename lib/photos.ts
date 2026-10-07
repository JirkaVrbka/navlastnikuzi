// Is the stored `picture_path` an external, display-as-is image URL (set via the
// MCP `set_player_photo` tool's URL mode) rather than a `player-photos` bucket
// object name? An absolute http(s) URL is shown straight from its remote host
// and must never be treated as a bucket object (no cleanup, no URL assembly).
// This rule lives here once so every caller (display + cleanup) agrees.
export function isExternalPhotoUrl(path: string | null | undefined): boolean {
  return typeof path === "string" && /^https?:\/\//i.test(path);
}

// Build the public display URL for a player photo from its stored object path.
//
// `players.picture_path` normally stores only the object path inside the public
// `player-photos` bucket (e.g. "<uuid>.jpg"), never a full URL — a stored
// "http://127.0.0.1:54321/..." would be environment-specific and break on
// cloud. The URL is assembled here from the per-environment Supabase URL, so it
// resolves to the local stack in dev/test and to the project host in production
// with no change. Public buckets serve /object/public/... with no read policy.
//
// Exception: an external image URL (MCP URL mode) is already a full address and
// is returned unchanged so the app displays it straight from its remote host.
export function publicPhotoUrl(path: string): string {
  if (isExternalPhotoUrl(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/player-photos/${path}`;
}
