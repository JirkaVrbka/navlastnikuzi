-- Mission profit (zisk) may now be NEGATIVE — a mission can lose money. Drop the
-- old non-negative floor. The potential >= profit invariant stays enforced by
-- bank_entries_potential_check (potential still can't be below the realized profit).
ALTER TABLE "bank_entries" DROP CONSTRAINT IF EXISTS "bank_entries_profit_check";
