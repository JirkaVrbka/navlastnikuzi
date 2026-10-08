import { Skeleton } from "@/components/ui/skeleton";

// Instant placeholder for Itinerář — title + sub-label row, then day blocks
// of stacked event rows.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-5">
      <Skeleton className="h-9 w-40" />
      <div className="mb-5 flex items-center justify-between gap-2">
        <Skeleton className="mt-2 h-3 w-28" />
      </div>

      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, d) => (
          <div key={d} className="flex flex-col gap-2.5">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-full rounded-[var(--radius)]"
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
