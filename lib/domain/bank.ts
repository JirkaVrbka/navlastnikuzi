// Bank summary math — pure, framework/DB-free game logic.
//
// There is one global bank. Each mission entry records a realized `profit` and
// a `potential` (what the mission could still be worth). The summary exposes the
// running total of realized profit and the still-"unrealized" remainder.
// The parameter type is structural on purpose: the DB layer passes its Drizzle
// rows straight in, without this module importing the row type.

export function summarizeBank(
  entries: { profit: number; potential: number }[],
): { totalProfit: number; unrealized: number } {
  const totalProfit = entries.reduce((sum, e) => sum + e.profit, 0);
  const totalPotential = entries.reduce((sum, e) => sum + e.potential, 0);
  return { totalProfit, unrealized: totalPotential - totalProfit };
}

// Thousands grouping uses a non-breaking space (U+00A0) so an amount never wraps
// mid-number; "Kč" follows after a regular space. Only the integer part matters —
// the domain deals in whole koruna (no haléře).
const GROUP_SEPARATOR = " ";

export function formatKc(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(n)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return `${sign}${grouped} Kč`;
}
