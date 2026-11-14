// MoneyLog domain rules (pure functions, no I/O). Every rule here is enforced on the
// server; the UI only repeats some of them for quick feedback (System SDS §1).
import { parseMoney } from "./money";
import { isValidDate } from "./dates";

export type AccountType = "CASH" | "LOAN_GIVEN" | "LOAN_TAKEN" | "INCOME" | "EXPENSE";
export type AccountSubtype = "WALLET" | "BANK" | "CREDIT_CARD" | "OTHER_LOAN" | null;
export type TransactionKind = "PAYMENT" | "RECEIPT";

export interface LedgerAccount {
  id: string;
  type: AccountType;
  subtype: AccountSubtype;
  openingBalance: number; // satang
  isActive: boolean;
}

export interface LedgerLine {
  accountId: string;
  amount: number; // satang
}

export interface LedgerTransaction {
  kind: TransactionKind;
  date: string; // YYYY-MM-DD
  primaryAccountId: string;
  total: number; // satang
  lines: LedgerLine[];
}

export interface RuleError {
  code: string;
  message: string;
  details?: { field?: string; message: string }[];
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: RuleError };
const fail = (code: string, message: string, details?: RuleError["details"]): { ok: false; error: RuleError } => ({
  ok: false,
  error: { code, message, ...(details ? { details } : {}) },
});

// BR-11: balances increase with debits for these types, with credits for the others.
const DEBIT_NORMAL: ReadonlySet<AccountType> = new Set(["CASH", "LOAN_GIVEN", "EXPENSE"]);
export const OPENING_BALANCE_TYPES: ReadonlySet<AccountType> = new Set(["CASH", "LOAN_GIVEN", "LOAN_TAKEN"]);

/**
 * BR-11 double entry. A PAYMENT credits its paying account and debits each line account;
 * a RECEIPT debits its receiving account and credits each line account.
 * balance = opening + (debits − credits) for CASH/LOAN_GIVEN/EXPENSE,
 *           opening + (credits − debits) for LOAN_TAKEN (amount owed) and INCOME.
 */
export function computeBalances(accounts: LedgerAccount[], transactions: LedgerTransaction[]): Map<string, number> {
  const debit = new Map<string, number>();
  const credit = new Map<string, number>();
  const add = (m: Map<string, number>, id: string, v: number) => m.set(id, (m.get(id) ?? 0) + v);

  for (const t of transactions) {
    if (t.kind === "PAYMENT") {
      add(credit, t.primaryAccountId, t.total);
      for (const l of t.lines) add(debit, l.accountId, l.amount);
    } else {
      add(debit, t.primaryAccountId, t.total);
      for (const l of t.lines) add(credit, l.accountId, l.amount);
    }
  }

  const balances = new Map<string, number>();
  for (const a of accounts) {
    const d = debit.get(a.id) ?? 0;
    const c = credit.get(a.id) ?? 0;
    balances.set(a.id, a.openingBalance + (DEBIT_NORMAL.has(a.type) ? d - c : c - d));
  }
  return balances;
}

export interface Totals {
  cash: number;
  creditCardDebt: number;
  loansTaken: number;
  loansGiven: number;
}

export function computeTotals(accounts: LedgerAccount[], balances: Map<string, number>): Totals {
  const totals: Totals = { cash: 0, creditCardDebt: 0, loansTaken: 0, loansGiven: 0 };
  for (const a of accounts) {
    const b = balances.get(a.id) ?? 0;
    if (a.type === "CASH") totals.cash += b;
    if (a.type === "LOAN_TAKEN") {
      totals.loansTaken += b;
      if (a.subtype === "CREDIT_CARD") totals.creditCardDebt += b;
    }
    if (a.type === "LOAN_GIVEN") totals.loansGiven += b;
  }
  return totals;
}

/** BR-13 + BR-14: opening balance only on CASH / LOAN_*, amount >= 0, date valid and not in the future. */
export function validateOpeningBalance(
  account: LedgerAccount,
  amountInput: unknown,
  dateInput: unknown,
  today: string,
): Result<{ amount: number; date: string }> {
  if (!OPENING_BALANCE_TYPES.has(account.type)) {
    return fail("OPENING_BALANCE_NOT_ALLOWED", "Opening balances are only for cash, loan given and loan taken accounts.");
  }
  const amount = parseMoney(amountInput, { allowZero: true });
  if (!amount.ok) {
    return fail("INVALID_AMOUNT", "Amount must be 0 or more, with at most 2 decimals and at most 9,999,999.99.", [
      { field: "amount", message: "Invalid amount." },
    ]);
  }
  if (!isValidDate(dateInput)) {
    return fail("VALIDATION_ERROR", "Date must be a valid date (YYYY-MM-DD).", [{ field: "date", message: "Invalid date." }]);
  }
  if (dateInput > today) {
    return fail("DATE_IN_FUTURE", "The date cannot be in the future.", [{ field: "date", message: "Date is in the future." }]);
  }
  return { ok: true, value: { amount: amount.value, date: dateInput } };
}
