import { db } from "@/lib/db";

// Every bank entry, newest first. One global bank (no per-event/day), so this is
// the single read the Banka page needs; the summary math (lib/domain/bank.ts)
// runs over the same rows. Mirrors the read-helper style of lib/db/confession.ts.
export async function getBankEntries() {
  return db.query.bankEntries.findMany({
    orderBy: (b, { desc }) => [desc(b.createdAt)],
  });
}

// Inferred row type for the client UI (Phase D).
export type BankEntryRow = Awaited<ReturnType<typeof getBankEntries>>[number];
