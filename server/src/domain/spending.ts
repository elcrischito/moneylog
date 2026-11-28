// F-13 Category spending — contract docs/sprints/sprint-2/F-13-category-spending.md
import type { AccountType, LedgerTransaction } from "./ledger";

export interface SpendingAccount {
  id: string;
  name: string;
  type: AccountType;
}
export interface CategoryRow {
  accountId: string;
  name: string;
  amount: number; // satang
  share: string; // one decimal, half-up, e.g. "58.3"
}

/**
 * Share = amount / total × 100, half-up to one decimal, in integers:
 * per-mille = round(amount × 1000 / total) half-up, then "x.y".
 */
export function shareText(amount: number, total: number): string {
  if (total <= 0) return "0.0";
  const perMille = Math.floor((amount * 2000 + total) / (2 * total)); // round half-up of amount*1000/total
  return `${Math.floor(perMille / 10)}.${perMille % 10}`;
}

/**
 * BR-12: only lines on EXPENSE accounts count; dates inclusive; categories with 0.00 are not listed;
 * sorted by amount desc, then name. Inactive expense accounts are included (they are in `accounts`).
 */
export function categorySpending(accounts: SpendingAccount[], txns: LedgerTransaction[], from: string, to: string): { total: number; categories: CategoryRow[] } {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const sums = new Map<string, number>();
  for (const t of txns) {
    if (t.date < from || t.date > to) continue;
    for (const l of t.lines) {
      if (byId.get(l.accountId)?.type !== "EXPENSE") continue;
      sums.set(l.accountId, (sums.get(l.accountId) ?? 0) + l.amount);
    }
  }
  const total = [...sums.values()].reduce((s, v) => s + v, 0);
  const categories = [...sums.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([accountId, amount]) => ({ accountId, name: byId.get(accountId)!.name, amount, share: shareText(amount, total) }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return { total, categories };
}
