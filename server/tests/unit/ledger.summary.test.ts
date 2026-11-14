// Domain unit tests for F-07 — TEST-UNIT-06 (contract F-07-F-08-summary-and-history.md)
import { describe, it, expect } from "vitest";
import { summarize, type LedgerAccount, type LedgerTransaction } from "../../src/domain/ledger";

const acc = (id: string, type: LedgerAccount["type"], subtype: LedgerAccount["subtype"] = null, openingBalance = 0): LedgerAccount => ({
  id, type, subtype, openingBalance, isActive: true,
});
const accounts = new Map(
  [acc("bank", "CASH", "BANK", 1000000), acc("wallet", "CASH", "WALLET"), acc("card", "LOAN_TAKEN", "CREDIT_CARD"),
   acc("mom", "LOAN_TAKEN", "OTHER_LOAN"), acc("ploy", "LOAN_GIVEN"), acc("salary", "INCOME"), acc("interest", "INCOME"),
   acc("dining", "EXPENSE"), acc("groceries", "EXPENSE")].map((a) => [a.id, a]),
);
const journey: LedgerTransaction[] = [
  { kind: "RECEIPT", date: "2026-11-05", primaryAccountId: "bank", total: 3000000, lines: [{ accountId: "salary", amount: 3000000 }] },
  { kind: "PAYMENT", date: "2026-11-08", primaryAccountId: "card", total: 150000, lines: [{ accountId: "dining", amount: 90000 }, { accountId: "groceries", amount: 60000 }] },
  { kind: "PAYMENT", date: "2026-11-10", primaryAccountId: "bank", total: 150000, lines: [{ accountId: "card", amount: 150000 }] }, // card repayment
  // borrowing + transfer received: no income
  { kind: "RECEIPT", date: "2026-11-11", primaryAccountId: "wallet", total: 300000, lines: [{ accountId: "mom", amount: 200000 }, { accountId: "bank", amount: 100000 }] },
  // money lent + transfer paid: no expense
  { kind: "PAYMENT", date: "2026-11-12", primaryAccountId: "wallet", total: 150000, lines: [{ accountId: "ploy", amount: 100000 }, { accountId: "bank", amount: 50000 }] },
  // loan given repaid + interest
  { kind: "RECEIPT", date: "2026-11-13", primaryAccountId: "bank", total: 101000, lines: [{ accountId: "ploy", amount: 100000 }, { accountId: "interest", amount: 1000 }] },
];
const names: Record<string, string> = { salary: "Salary", interest: "Interest", dining: "Dining", groceries: "Groceries" };

describe("TEST-UNIT-06 income and expense summary (BR-12, AC-07-1, AC-07-2)", () => {
  it("counts only INCOME and EXPENSE lines; transfers, borrowing, lending, repayments and opening balances are excluded", () => {
    const s = summarize(journey, accounts, "2026-11-01", "2026-11-30");
    expect(s.income.total).toBe(3001000);
    expect(s.expense.total).toBe(150000);
    expect(s.net).toBe(2851000);
    expect(s.income.byAccount).toEqual([{ accountId: "salary", amount: 3000000 }, { accountId: "interest", amount: 1000 }]);
    expect(s.expense.byAccount).toEqual([{ accountId: "dining", amount: 90000 }, { accountId: "groceries", amount: 60000 }]);
    expect(Object.keys(names)).toEqual(expect.arrayContaining(s.expense.byAccount.map((x) => x.accountId)));
  });

  it("uses inclusive date bounds and gives zeros outside the range", () => {
    expect(summarize(journey, accounts, "2026-11-08", "2026-11-08").expense.total).toBe(150000);
    expect(summarize(journey, accounts, "2026-11-08", "2026-11-08").income.total).toBe(0);
    const empty = summarize(journey, accounts, "2026-10-01", "2026-10-31");
    expect(empty).toMatchObject({ income: { total: 0, byAccount: [] }, expense: { total: 0, byAccount: [] }, net: 0 });
  });
});
