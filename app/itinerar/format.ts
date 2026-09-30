// "2024-10-12 23:00:00" (Postgres) or "2024-10-12T23:00" → "23:00"
export function hhmm(v: string): string {
  return v.replace("T", " ").slice(11, 16);
}
