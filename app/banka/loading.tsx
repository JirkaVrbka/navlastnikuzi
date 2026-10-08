import { Skeleton } from "@/components/ui/skeleton";

// Instant placeholder for Banka — title + sub-label, the hero summary, an add
// affordance, then the ledger rows.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-2">
      <Skeleton className="mt-1.5 mb-2 h-9 w-28" />
      <Skeleton className="mb-[18px] h-3 w-24" />

      <Skeleton className="h-28 w-full rounded-[var(--radius)]" />

      <Skeleton className="mt-4 mb-4 h-11 w-full" />

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[var(--radius)]" />
        ))}
      </div>
    </main>
  );
}
