// F-10 Loans overview — contract docs/sprints/sprint-2/F-10-loans-overview.md
import type { AccountSubtype, AccountType, LedgerTransaction } from "./ledger";

export interface LoanAccount {
  id: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  isActive: boolean;
  openingBalance: number;
  openingDate: string | null;
}
export type LoanStatus = "OPEN" | "SETTLED" | "OVERPAID";
export interface LoanRow extends LoanAccount {
  outstanding: number;
  lastActivity: string | null;
  status: LoanStatus;
}
export interface LoanOverview {
  taken: LoanRow[];
  given: LoanRow[];
  totals: { taken: number; given: number; net: number };
}

const LOAN_TYPES = new Set<AccountType>(["LOAN_TAKEN", "LOAN_GIVEN"]);

/**
 * Outstanding = derived balance (BR-11, computeBalances). Nothing new is stored.
 * Inactive loan accounts are listed only when their outstanding amount is not 0.00.
 */
export function loanOverview(accounts: LoanAccount[], balances: Map<string, number>, txns: LedgerTransaction[]): LoanOverview {
  const last = new Map<string, string>();
  const touch = (id: string, date: string) => {
    if ((last.get(id) ?? "") < date) last.set(id, date);
  };
  for (const t of txns) {
    touch(t.primaryAccountId, t.date);
    for (const l of t.lines) touch(l.accountId, t.date);
  }
  const rows: LoanRow[] = [];
  for (const a of accounts) {
    if (!LOAN_TYPES.has(a.type)) continue;
    const outstanding = balances.get(a.id) ?? a.openingBalance;
    if (!a.isActive && outstanding === 0) continue;
    const status: LoanStatus = outstanding > 0 ? "OPEN" : outstanding === 0 ? "SETTLED" : "OVERPAID";
    rows.push({ ...a, outstanding, lastActivity: last.get(a.id) ?? null, status });
  }
  rows.sort((x, y) => y.outstanding - x.outstanding || x.name.localeCompare(y.name));
  const taken = rows.filter((r) => r.type === "LOAN_TAKEN");
  const given = rows.filter((r) => r.type === "LOAN_GIVEN");
  const sum = (list: LoanRow[]) => list.reduce((s, r) => s + r.outstanding, 0);
  const totals = { taken: sum(taken), given: sum(given), net: 0 };
  totals.net = totals.given - totals.taken;
  return { taken, given, totals };
}
