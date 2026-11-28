// F-13 — TEST-UNIT-24 categorySpending (contract F-13 v1.0)
import { describe, it, expect } from "vitest";
import { categorySpending, shareText, type SpendingAccount } from "../../src/domain/spending";
import type { LedgerTransaction } from "../../src/domain/ledger";

const accounts: SpendingAccount[] = [
  { id: "dining", name: "Dining", type: "EXPENSE" },
  { id: "groceries", name: "Groceries", type: "EXPENSE" },
  { id: "telecom", name: "Telecom", type: "EXPENSE" },
  { id: "card", name: "KTC Credit Card", type: "LOAN_TAKEN" },
  { id: "bank", name: "Bank", type: "CASH" },
  { id: "salary", name: "Salary", type: "INCOME" },
];
const pay = (date: string, primary: string, lines: [string, number][]): LedgerTransaction => ({
  kind: "PAYMENT", date, primaryAccountId: primary, total: lines.reduce((s, [, a]) => s + a, 0), lines: lines.map(([accountId, amount]) => ({ accountId, amount })),
});

describe("TEST-UNIT-24 categorySpending", () => {
  it("only EXPENSE lines count; repayment, salary and transfers never do (AC-13-1)", () => {
    const txns = [
      pay("2026-11-27", "card", [["dining", 90000], ["groceries", 60000]]),
      pay("2026-11-27", "bank", [["card", 150000]]),
      { kind: "RECEIPT" as const, date: "2026-11-27", primaryAccountId: "bank", total: 3000000, lines: [{ accountId: "salary", amount: 3000000 }] },
    ];
    expect(categorySpending(accounts, txns, "2026-11-01", "2026-11-30")).toEqual({
      total: 150000,
      categories: [
        { accountId: "dining", name: "Dining", amount: 90000, share: "60.0" },
        { accountId: "groceries", name: "Groceries", amount: 60000, share: "40.0" },
      ],
    });
  });

  it("1/3 split: 33.3 each, equal amounts sorted by name (AC-13-2)", () => {
    const txns = [pay("2026-11-10", "bank", [["telecom", 100], ["groceries", 100], ["dining", 100]])];
    expect(categorySpending(accounts, txns, "2026-11-01", "2026-11-30").categories.map((c) => [c.name, c.amount, c.share])).toEqual([
      ["Dining", 100, "33.3"], ["Groceries", 100, "33.3"], ["Telecom", 100, "33.3"],
    ]);
  });

  it("dates are inclusive; outside the range nothing counts; empty period (AC-13-3, AC-13-4)", () => {
    const txns = [pay("2026-11-30", "bank", [["dining", 2500]]), pay("2026-12-01", "bank", [["dining", 999]]), pay("2026-10-31", "bank", [["dining", 1]])];
    expect(categorySpending(accounts, txns, "2026-11-01", "2026-11-30")).toEqual({ total: 2500, categories: [{ accountId: "dining", name: "Dining", amount: 2500, share: "100.0" }] });
    expect(categorySpending(accounts, txns, "2026-09-01", "2026-09-30")).toEqual({ total: 0, categories: [] });
  });

  it("shares are rounded half-up to one decimal in integer arithmetic", () => {
    expect(shareText(1, 3)).toBe("33.3");
    expect(shareText(2, 3)).toBe("66.7");
    expect(shareText(1, 8)).toBe("12.5");
    expect(shareText(1, 16)).toBe("6.3"); // 6.25 → 6.3 (half-up)
    expect(shareText(7, 7)).toBe("100.0");
  });
});
