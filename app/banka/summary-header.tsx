import { formatKc } from "@/lib/domain/bank";

// Hero summary for the Banka screen. Σ zisk is the loud total the organizer
// reads first; the "nevyužitý potenciál" (Σ potenciál − Σ zisk) sits beneath,
// quieter and muted. No interactivity — a plain server component fed by the page.
export function SummaryHeader({
  totalProfit,
  unrealized,
}: {
  totalProfit: number;
  unrealized: number;
}) {
  return (
    <section className="mb-5 flex flex-col items-center text-center">
      <p className="text-muted-foreground mb-1 text-[11px] tracking-[0.12em] uppercase">
        Celkový zisk
      </p>
      <p className="font-display text-gold text-[56px] leading-none font-semibold tabular-nums">
        {formatKc(totalProfit)}
      </p>
      <p className="text-muted-foreground mt-3 text-[11px] tracking-[0.12em] uppercase">
        Nevyužitý potenciál
      </p>
      <p className="text-muted-foreground mt-0.5 text-[15px] tabular-nums">
        {formatKc(unrealized)}
      </p>
    </section>
  );
}
