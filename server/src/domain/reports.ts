// F-16 Reports — contract docs/sprints/sprint-3/F-16-reports.md
import { computeBalances, type LedgerAccount, type LedgerTransaction } from "./ledger";

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

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based

/** Months 1–24 as an integer; undefined → 6; anything else → null (400). */
export function parseMonths(input: unknown): number | null {
  if (input === undefined || input === "") return 6;
  if (typeof input !== "string" || !/^\d+$/.test(input)) return null;
  const n = Number(input);
  return n >= 1 && n <= MAX_REPORT_MONTHS ? n : null;
}

/**
 * Last `months` calendar months, oldest first; the current month ends `today` (Asia/Bangkok).
 * Income/expense: BR-12 (only INCOME / EXPENSE lines). Net position at month end:
 * CASH + LOAN_GIVEN − LOAN_TAKEN balances (BR-11) from transactions dated ≤ month end;
 * an opening balance counts only from its opening date (BR-13).
 */
export function monthlyReport(accounts: ReportAccount[], txns: LedgerTransaction[], today: string, months: number): MonthRow[] {
  const type = new Map(accounts.map((a) => [a.id, a.type]));
  const [ty, tm] = today.split("-").map(Number);
  const rows: MonthRow[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const idx = ty * 12 + (tm - 1) - k;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const month = `${y}-${String(m).padStart(2, "0")}`;
    const from = `${month}-01`;
    const to = k === 0 ? today : `${month}-${String(lastDay(y, m)).padStart(2, "0")}`;

    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (t.date < from || t.date > to) continue;
      for (const l of t.lines) {
        if (type.get(l.accountId) === "INCOME") income += l.amount;
        if (type.get(l.accountId) === "EXPENSE") expense += l.amount;
      }
    }
    const asOf = accounts.map((a) => ({ ...a, openingBalance: a.openingDate && a.openingDate <= to ? a.openingBalance : 0 }));
    const balances = computeBalances(asOf, txns.filter((t) => t.date <= to));
    let netPosition = 0;
    for (const a of accounts) {
      const b = balances.get(a.id) ?? 0;
      if (a.type === "CASH" || a.type === "LOAN_GIVEN") netPosition += b;
      if (a.type === "LOAN_TAKEN") netPosition -= b;
    }
    rows.push({ month, from, to, income, expense, net: income - expense, netPosition });
  }
  return rows;
}
