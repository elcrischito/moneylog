// F-16 Reports — contract docs/sprints/sprint-3/F-16-reports.md
import type { LedgerAccount, LedgerTransaction } from "./ledger";

export interface ReportAccount extends LedgerAccount {
  openingDate: string | null;
}
export interface MonthRow {
  month: string; // YYYY-MM
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  netPosition: number;
}
export const MAX_REPORT_MONTHS = 24;

/** RED stub — implemented in the GREEN commit. */
export function monthlyReport(_accounts: ReportAccount[], _txns: LedgerTransaction[], _today: string, _months: number): MonthRow[] {
  return [];
}

/** RED stub. */
export function parseMonths(_input: unknown): number | null {
  return 6;
}
