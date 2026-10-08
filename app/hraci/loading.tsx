import { Skeleton } from "@/components/ui/skeleton";

// Instant placeholder for Hráči — title + sub-label, then a column of
// player cards.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px]">
      <Skeleton className="mt-1.5 h-9 w-28" />
      <Skeleton className="mt-2 mb-[18px] h-3 w-32" />

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[var(--radius)]" />
        ))}
      </div>
    </main>
  );
}
