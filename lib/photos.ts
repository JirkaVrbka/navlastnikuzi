// Build the public display URL for a player photo from its stored object path.
//
// `players.picture_path` stores only the object path inside the public
// `player-photos` bucket (e.g. "<uuid>.jpg"), never a full URL — a stored
// "http://127.0.0.1:54321/..." would be environment-specific and break on
// cloud. The URL is assembled here from the per-environment Supabase URL, so it
// resolves to the local stack in dev/test and to the project host in production
// with no change. Public buckets serve /object/public/... with no read policy.
export function publicPhotoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/player-photos/${path}`;
}
