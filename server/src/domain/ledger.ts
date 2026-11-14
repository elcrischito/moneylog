// MoneyLog domain rules (pure functions, no I/O). Every rule here is enforced on the
// server; the UI only repeats some of them for quick feedback (System SDS §1).
import { parseMoney, formatMoney } from "./money";
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

// ---------------------------------------------------------------------------
// F-05 / F-06: transaction validation (BR-06 … BR-14). Runs on the server for
// every POST /api/transactions; nothing is stored unless it returns ok.
// ---------------------------------------------------------------------------
export const MAX_LINES = 20;
export const MAX_DESCRIPTION = 200;

// BR-08 / BR-09
export const ALLOWED: Record<TransactionKind, { primary: ReadonlySet<AccountType>; lines: ReadonlySet<AccountType> }> = {
  PAYMENT: { primary: new Set(["CASH", "LOAN_TAKEN"]), lines: new Set(["EXPENSE", "LOAN_TAKEN", "LOAN_GIVEN", "CASH"]) },
  RECEIPT: { primary: new Set(["CASH"]), lines: new Set(["INCOME", "LOAN_GIVEN", "LOAN_TAKEN", "CASH"]) },
};

export interface ValidTransaction {
  kind: TransactionKind;
  date: string;
  description: string;
  primaryAccountId: string;
  total: number;
  lines: LedgerLine[];
}

/**
 * @param accounts the caller's own accounts only — an id that is not in this map
 *                 (unknown, or another user's) is reported as ACCOUNT_NOT_FOUND (BR-10).
 */
export function validateTransaction(input: unknown, accounts: Map<string, LedgerAccount>, today: string): Result<ValidTransaction> {
  const body = (input ?? {}) as Record<string, unknown>;
  const shape: { field: string; message: string }[] = [];
  if (body.kind !== "PAYMENT" && body.kind !== "RECEIPT") shape.push({ field: "kind", message: "Kind must be PAYMENT or RECEIPT." });
  if (typeof body.accountId !== "string" || !body.accountId) shape.push({ field: "accountId", message: "Choose an account." });
  if (!isValidDate(body.date)) shape.push({ field: "date", message: "Date must be a valid date (YYYY-MM-DD)." });
  if (!Array.isArray(body.lines)) shape.push({ field: "lines", message: "Lines must be a list." });
  const description = body.description === undefined || body.description === null ? "" : body.description;
  if (typeof description !== "string" || description.trim().length > MAX_DESCRIPTION) {
    shape.push({ field: "description", message: `Description must be text of at most ${MAX_DESCRIPTION} characters.` });
  }
  const rawLines = Array.isArray(body.lines) ? (body.lines as Record<string, unknown>[]) : [];
  rawLines.forEach((l, i) => {
    if (!l || typeof l !== "object" || typeof l.accountId !== "string" || !l.accountId) {
      shape.push({ field: `lines[${i}].accountId`, message: "Choose an account for this line." });
    }
  });
  if (shape.length > 0) return fail("VALIDATION_ERROR", "Some fields are missing or invalid.", shape);

  const kind = body.kind as TransactionKind;
  if (rawLines.length < 1 || rawLines.length > MAX_LINES) {
    return fail("INVALID_LINE_COUNT", `A transaction needs between 1 and ${MAX_LINES} allocation lines.`, [{ field: "lines", message: "Wrong number of lines." }]);
  }

  // BR-07 amounts
  const total = parseMoney(body.total);
  const amountErrors: { field: string; message: string }[] = [];
  if (!total.ok) amountErrors.push({ field: "total", message: "Invalid total." });
  const lines: LedgerLine[] = [];
  rawLines.forEach((l, i) => {
    const a = parseMoney(l.amount);
    if (!a.ok) amountErrors.push({ field: `lines[${i}].amount`, message: "Invalid amount." });
    else lines.push({ accountId: l.accountId as string, amount: a.value });
  });
  if (amountErrors.length > 0 || !total.ok) {
    return fail("INVALID_AMOUNT", "Amounts must be greater than 0, with at most 2 decimals and at most 9,999,999.99.", amountErrors);
  }

  // BR-10 ownership and active accounts
  const primary = accounts.get(body.accountId as string);
  const missing: { field: string; message: string }[] = [];
  if (!primary || !primary.isActive) missing.push({ field: "accountId", message: "Account not found." });
  lines.forEach((l, i) => {
    const a = accounts.get(l.accountId);
    if (!a || !a.isActive) missing.push({ field: `lines[${i}].accountId`, message: "Account not found." });
  });
  if (missing.length > 0 || !primary) return fail("ACCOUNT_NOT_FOUND", "One or more accounts do not exist.", missing);

  // BR-08 / BR-09 types
  const rules = ALLOWED[kind];
  const typeErrors: { field: string; message: string }[] = [];
  if (!rules.primary.has(primary.type)) {
    typeErrors.push({ field: "accountId", message: kind === "PAYMENT" ? "Pay from a cash, bank or credit card / loan account." : "Receive into a cash or bank account." });
  }
  lines.forEach((l, i) => {
    if (!rules.lines.has(accounts.get(l.accountId)!.type)) {
      typeErrors.push({ field: `lines[${i}].accountId`, message: kind === "PAYMENT" ? "Income accounts cannot be used in a payment." : "Expense accounts cannot be used when receiving money." });
    }
  });
  if (typeErrors.length > 0) return fail("ACCOUNT_TYPE_NOT_ALLOWED", "This account type is not allowed here.", typeErrors);

  const selfIndex = lines.findIndex((l) => l.accountId === primary.id);
  if (selfIndex >= 0) {
    return fail("LINE_USES_PRIMARY_ACCOUNT", "A line cannot use the same account the money is paid from or received into.", [
      { field: `lines[${selfIndex}].accountId`, message: "Same as the main account." },
    ]);
  }

  // BR-06 exact sum in satang
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (sum !== total.value) {
    return fail("LINES_TOTAL_MISMATCH", `Allocation lines (${formatMoney(sum)}) must equal the total (${formatMoney(total.value)}).`, [
      { field: "lines", message: "Lines do not add up to the total." },
    ]);
  }

  // BR-14
  if ((body.date as string) > today) {
    return fail("DATE_IN_FUTURE", "The date cannot be in the future.", [{ field: "date", message: "Date is in the future." }]);
  }

  return {
    ok: true,
    value: { kind, date: body.date as string, description: (description as string).trim(), primaryAccountId: primary.id, total: total.value, lines },
  };
}

// ---------------------------------------------------------------------------
// F-07: income and expense summary (BR-12). Only lines on INCOME and EXPENSE
// accounts count, so transfers, borrowing, lending, loan/card repayments and
// opening balances can never appear as income or expense.
// ---------------------------------------------------------------------------
export interface AccountAmount {
  accountId: string;
  amount: number;
}
export interface Summary {
  income: { total: number; byAccount: AccountAmount[] };
  expense: { total: number; byAccount: AccountAmount[] };
  net: number;
}

export function summarize(transactions: LedgerTransaction[], accounts: Map<string, LedgerAccount>, from: string, to: string): Summary {
  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  for (const t of transactions) {
    if (t.date < from || t.date > to) continue; // inclusive bounds
    for (const l of t.lines) {
      const type = accounts.get(l.accountId)?.type;
      if (type === "INCOME") income.set(l.accountId, (income.get(l.accountId) ?? 0) + l.amount);
      if (type === "EXPENSE") expense.set(l.accountId, (expense.get(l.accountId) ?? 0) + l.amount);
    }
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].filter(([, v]) => v !== 0).map(([accountId, amount]) => ({ accountId, amount })).sort((a, b) => b.amount - a.amount);
  const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);
  const incomeTotal = sum(income);
  const expenseTotal = sum(expense);
  return {
    income: { total: incomeTotal, byAccount: sorted(income) },
    expense: { total: expenseTotal, byAccount: sorted(expense) },
    net: incomeTotal - expenseTotal,
  };
}
