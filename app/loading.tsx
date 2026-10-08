import { Skeleton } from "@/components/ui/skeleton";

// Instant placeholder for Home — wordmark header, "Moje události" title,
// a role chip, a few agenda cards, then the outline action buttons.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px]">
      <header className="flex justify-center px-0.5 pt-[18px] pb-3">
        <Skeleton className="h-[38px] w-64" />
      </header>

      <Skeleton className="mt-1.5 h-9 w-48" />
      <Skeleton className="mt-2 mb-[18px] h-3 w-28" />

      <Skeleton className="mb-[18px] h-9 w-full rounded-full" />

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[var(--radius)]" />
        ))}
      </div>

      <Skeleton className="mt-4 h-[46px] w-full" />
      <Skeleton className="mt-2 h-[46px] w-full" />
      <Skeleton className="mt-6 h-[46px] w-full" />
    </main>
  );
}
