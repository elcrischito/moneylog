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

/** RED stub — implemented in the GREEN commit. */
export function categorySpending(_accounts: SpendingAccount[], _txns: LedgerTransaction[], _from: string, _to: string): { total: number; categories: CategoryRow[] } {
  return { total: 0, categories: [] };
}

/** RED stub. */
export function shareText(_amount: number, _total: number): string {
  return "";
}
