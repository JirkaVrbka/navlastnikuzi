import { Skeleton } from "@/components/ui/skeleton";

// Instant placeholder for Konkláve — title + sub-label, a tall active card,
// history rows, then the rooms section.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-2">
      <Skeleton className="mt-1.5 mb-2 h-9 w-40" />
      <Skeleton className="mb-[18px] h-3 w-32" />

      <Skeleton className="h-64 w-full rounded-[var(--radius)]" />

      <div className="mt-6 flex flex-col gap-2.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[var(--radius)]" />
        ))}
      </div>

      <Skeleton className="mt-6 h-6 w-28" />
      <div className="mt-2.5 flex flex-col gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-[var(--radius)]" />
        ))}
      </div>
    </main>
  );
}
