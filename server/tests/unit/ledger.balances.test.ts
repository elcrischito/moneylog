// Domain unit tests for F-03/F-04 — TEST-UNIT-04, TEST-UNIT-05
// Contract: docs/sprints/sprint-1/F-03-F-04-accounts-and-opening-balance.md
import { describe, it, expect } from "vitest";
import { parseMoney, formatMoney } from "../../src/domain/money";
import { computeBalances, computeTotals, validateOpeningBalance, type LedgerAccount, type LedgerTransaction } from "../../src/domain/ledger";

const acc = (id: string, type: LedgerAccount["type"], subtype: LedgerAccount["subtype"] = null, openingBalance = 0): LedgerAccount => ({
  id, type, subtype, openingBalance, isActive: true,
});
const accounts = [
  acc("bank", "CASH", "BANK"),
  acc("wallet", "CASH", "WALLET"),
  acc("card", "LOAN_TAKEN", "CREDIT_CARD"),
  acc("mom", "LOAN_TAKEN", "OTHER_LOAN"),
  acc("ploy", "LOAN_GIVEN"),
  acc("salary", "INCOME"),
  acc("dining", "EXPENSE"),
  acc("groceries", "EXPENSE"),
];
const THB = (s: string) => {
  const r = parseMoney(s);
  if (!r.ok) throw new Error(`bad amount ${s}`);
  return r.value;
};

describe("money", () => {
  it("formats satang as a 2-decimal string, including negatives", () => {
    expect(formatMoney(3850000)).toBe("38500.00");
    expect(formatMoney(-5000)).toBe("-50.00");
    expect(formatMoney(5)).toBe("0.05");
  });
});

describe("TEST-UNIT-04 opening balance rules (AC-04-2)", () => {
  const today = "2026-11-14";
  it("is allowed on CASH, LOAN_TAKEN and LOAN_GIVEN, with 0 as the lower boundary", () => {
    for (const a of [accounts[0], accounts[2], accounts[4]]) {
      expect(validateOpeningBalance(a, "0.00", "2026-11-01", today)).toEqual({ ok: true, value: { amount: 0, date: "2026-11-01" } });
    }
    expect(validateOpeningBalance(accounts[0], "10000.00", today, today)).toEqual({ ok: true, value: { amount: 1000000, date: today } });
  });
  it("is rejected on INCOME and EXPENSE accounts", () => {
    for (const a of [accounts[5], accounts[6]]) {
      const r = validateOpeningBalance(a, "100.00", "2026-11-01", today);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("OPENING_BALANCE_NOT_ALLOWED");
    }
  });
  it("rejects negative or malformed amounts, bad dates and future dates", () => {
    const codes = [
      validateOpeningBalance(accounts[0], "-1.00", "2026-11-01", today),
      validateOpeningBalance(accounts[0], "1.234", "2026-11-01", today),
      validateOpeningBalance(accounts[0], "100", "2026-13-40", today),
      validateOpeningBalance(accounts[0], "100", "2026-11-15", today),
    ].map((r) => (r.ok ? "ok" : r.error.code));
    expect(codes).toEqual(["INVALID_AMOUNT", "INVALID_AMOUNT", "VALIDATION_ERROR", "DATE_IN_FUTURE"]);
  });
});

describe("TEST-UNIT-05 balances by double entry (AC-03-1, AC-03-2, BR-11, BR-15)", () => {
  // The theme's Sprint 1 example.
  const withOpening = accounts.map((a) => (a.id === "bank" ? { ...a, openingBalance: THB("10000.00") } : a));
  const journey: LedgerTransaction[] = [
    { kind: "RECEIPT", date: "2026-11-05", primaryAccountId: "bank", total: THB("30000"), lines: [{ accountId: "salary", amount: THB("30000") }] },
    { kind: "PAYMENT", date: "2026-11-08", primaryAccountId: "card", total: THB("1500"), lines: [
      { accountId: "dining", amount: THB("900") }, { accountId: "groceries", amount: THB("600") }] },
    { kind: "PAYMENT", date: "2026-11-10", primaryAccountId: "bank", total: THB("1500"), lines: [{ accountId: "card", amount: THB("1500") }] },
  ];

  it("gives the expected balances for opening → salary → split card purchase → card repayment", () => {
    const b = computeBalances(withOpening, journey);
    expect(formatMoney(b.get("bank")!)).toBe("38500.00");
    expect(formatMoney(b.get("card")!)).toBe("0.00");
    expect(formatMoney(b.get("dining")!)).toBe("900.00");
    expect(formatMoney(b.get("groceries")!)).toBe("600.00");
    expect(formatMoney(b.get("salary")!)).toBe("30000.00");
  });

  it("shows the card debt before repayment and computes the totals", () => {
    const b = computeBalances(withOpening, journey.slice(0, 2));
    expect(formatMoney(b.get("card")!)).toBe("1500.00");
    const t = computeTotals(withOpening, b);
    expect(t).toEqual({ cash: THB("40000"), creditCardDebt: THB("1500"), loansTaken: THB("1500"), loansGiven: 0 });
  });

  it("handles borrowing, lending and transfers, and allows an overdraft", () => {
    const txns: LedgerTransaction[] = [
      // receive 3,000 into wallet: 2,000 borrowed from Mom + 1,000 transferred from bank
      { kind: "RECEIPT", date: "2026-11-11", primaryAccountId: "wallet", total: THB("3000"), lines: [
        { accountId: "mom", amount: THB("2000") }, { accountId: "bank", amount: THB("1000") }] },
      // pay 3,050 from wallet: lend 3,050 to Ploy -> wallet goes to -50 (overdraft recorded)
      { kind: "PAYMENT", date: "2026-11-12", primaryAccountId: "wallet", total: THB("3050"), lines: [{ accountId: "ploy", amount: THB("3050") }] },
    ];
    const b = computeBalances(accounts, txns);
    expect(formatMoney(b.get("wallet")!)).toBe("-50.00");
    expect(formatMoney(b.get("mom")!)).toBe("2000.00");
    expect(formatMoney(b.get("bank")!)).toBe("-1000.00");
    expect(formatMoney(b.get("ploy")!)).toBe("3050.00");
    expect(computeTotals(accounts, b)).toMatchObject({ loansTaken: THB("2000"), loansGiven: THB("3050"), creditCardDebt: 0 });
  });
});
