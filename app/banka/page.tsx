import { requireUser, getProfile } from "@/lib/auth";
import { getBankEntries } from "@/lib/db/bank";
import { summarizeBank } from "@/lib/domain/bank";
import { SummaryHeader } from "./summary-header";
import { BankEntryDialog } from "./bank-entry-dialog";
import { BankEntryRow } from "./bank-entry-row";

// Banka — one global bank for the organizers. Hero summary, add affordance, then
// the newest-first ledger (or a calm empty state). No bottom padding (global).
export default async function BankaPage() {
  // Overlap auth (requireUser redirect guard + profile lookup) with the bank
  // query in one Promise.all instead of awaiting them serially first.
  const [, profile, entries] = await Promise.all([
    requireUser(),
    getProfile(),
    getBankEntries(),
  ]);
  const admin = profile?.role === "admin";
  const summary = summarizeBank(entries);

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-2">
      <h1 className="font-display mt-1.5 mb-0.5 text-[27px] font-semibold tracking-[0.01em]">
        Banka
      </h1>
      <p className="text-muted-foreground mb-[18px] text-[11px] tracking-[0.12em] uppercase">
        Zisk z misí
      </p>

      <SummaryHeader
        totalProfit={summary.totalProfit}
        unrealized={summary.unrealized}
      />

      {admin ? (
        <div className="mb-4">
          <BankEntryDialog />
        </div>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Zatím žádné záznamy.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {entries.map((entry) => (
            <li key={entry.id}>
              <BankEntryRow entry={entry} isAdmin={admin} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
