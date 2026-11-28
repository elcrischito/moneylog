// F-10 — TEST-UNIT-21 loanOverview (contract F-10 v1.0)
import { describe, it, expect } from "vitest";
import { loanOverview, type LoanAccount } from "../../src/domain/loans";
import type { LedgerTransaction } from "../../src/domain/ledger";

const acc = (id: string, name: string, type: LoanAccount["type"], subtype: LoanAccount["subtype"] = null, extra: Partial<LoanAccount> = {}): LoanAccount => ({
  id, name, type, subtype, isActive: true, openingBalance: 0, openingDate: null, ...extra,
});
const accounts = [
  acc("card", "KTC Credit Card", "LOAN_TAKEN", "CREDIT_CARD"),
  acc("mom", "Loan from Mom", "LOAN_TAKEN", "OTHER_LOAN"),
  acc("amex", "Amex", "LOAN_TAKEN", "CREDIT_CARD"),
  acc("ploy", "Loan to Ploy", "LOAN_GIVEN", null, { openingBalance: 200000, openingDate: "2026-11-01" }),
  acc("old", "Old loan", "LOAN_GIVEN", null, { isActive: false }),
  acc("old2", "Old loan 2", "LOAN_GIVEN", null, { isActive: false }),
  acc("bank", "Bank", "CASH", "BANK"),
  acc("dining", "Dining", "EXPENSE"),
];
const balances = new Map([["card", 150000], ["mom", 150000], ["amex", -50], ["ploy", 150000], ["old", 0], ["old2", 700], ["bank", 99], ["dining", 1]]);
const txns: LedgerTransaction[] = [
  { kind: "PAYMENT", date: "2026-11-10", primaryAccountId: "card", total: 150000, lines: [{ accountId: "dining", amount: 150000 }] },
  { kind: "RECEIPT", date: "2026-11-20", primaryAccountId: "bank", total: 50000, lines: [{ accountId: "ploy", amount: 50000 }] },
  { kind: "PAYMENT", date: "2026-11-27", primaryAccountId: "bank", total: 50, lines: [{ accountId: "amex", amount: 50 }] },
  { kind: "PAYMENT", date: "2026-11-12", primaryAccountId: "card", total: 1, lines: [{ accountId: "dining", amount: 1 }] },
];

describe("TEST-UNIT-21 loanOverview", () => {
  const o = loanOverview(accounts, balances, txns);

  it("statuses OPEN / SETTLED / OVERPAID, only loan types, inactive only when not settled (AC-10-3, AC-10-5)", () => {
    expect(o.taken.map((r) => [r.name, r.outstanding, r.status])).toEqual([
      ["KTC Credit Card", 150000, "OPEN"],
      ["Loan from Mom", 150000, "OPEN"],
      ["Amex", -50, "OVERPAID"],
    ]);
    expect(o.given.map((r) => [r.name, r.outstanding, r.status])).toEqual([
      ["Loan to Ploy", 150000, "OPEN"],
      ["Old loan 2", 700, "OPEN"],
    ]);
    expect(o.given.find((r) => r.name === "Old loan")).toBeUndefined(); // inactive and settled
    expect(JSON.stringify(o)).not.toContain("Dining");
    expect(JSON.stringify(o)).not.toContain('"Bank"');
  });

  it("a zero outstanding active loan is SETTLED", () => {
    const z = loanOverview([acc("c", "Card", "LOAN_TAKEN", "CREDIT_CARD")], new Map([["c", 0]]), []);
    expect(z.taken).toMatchObject([{ outstanding: 0, status: "SETTLED", lastActivity: null }]);
  });

  it("sorted by outstanding desc, then name; lastActivity = latest date as primary or line (AC-10-4)", () => {
    expect(o.taken[0]).toMatchObject({ name: "KTC Credit Card", lastActivity: "2026-11-12" });
    expect(o.taken[1]).toMatchObject({ name: "Loan from Mom", lastActivity: null });
    expect(o.given[0]).toMatchObject({ lastActivity: "2026-11-20", openingBalance: 200000, openingDate: "2026-11-01" });
  });

  it("totals and net in satang, overpaid counted with its sign (AC-10-2, AC-10-3)", () => {
    expect(o.totals).toEqual({ taken: 150000 + 150000 - 50, given: 150000 + 700, net: 150700 - 299950 });
  });
});
