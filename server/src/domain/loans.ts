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

/** RED stub — implemented in the GREEN commit. */
export function loanOverview(_accounts: LoanAccount[], _balances: Map<string, number>, _txns: LedgerTransaction[]): LoanOverview {
  return { taken: [], given: [], totals: { taken: 0, given: 0, net: 0 } };
}
