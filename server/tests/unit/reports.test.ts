// F-16 — TEST-UNIT-26 monthlyReport (contract F-16 v1.0)
import { describe, it, expect } from "vitest";
import { monthlyReport, parseMonths, type ReportAccount } from "../../src/domain/reports";
import type { LedgerTransaction } from "../../src/domain/ledger";

const acc = (id: string, type: ReportAccount["type"], openingBalance = 0, openingDate: string | null = null, subtype: ReportAccount["subtype"] = null): ReportAccount =>
  ({ id, type, subtype, openingBalance, openingDate, isActive: true });
const accounts = [
  acc("bank", "CASH", 500000, "2026-11-15", "BANK"),
  acc("card", "LOAN_TAKEN", 0, null, "CREDIT_CARD"),
  acc("ploy", "LOAN_GIVEN", 0),
  acc("salary", "INCOME"), acc("dining", "EXPENSE"), acc("groceries", "EXPENSE"),
];
const tx = (kind: "PAYMENT" | "RECEIPT", date: string, primary: string, lines: [string, number][]): LedgerTransaction =>
  ({ kind, date, primaryAccountId: primary, total: lines.reduce((s, [, a]) => s + a, 0), lines: lines.map(([accountId, amount]) => ({ accountId, amount })) });
const txns = [
  tx("PAYMENT", "2026-10-20", "card", [["dining", 10000]]), // October: card debt 100.00
  tx("RECEIPT", "2026-11-01", "bank", [["salary", 3000000]]),
  tx("PAYMENT", "2026-11-05", "card", [["dining", 90000], ["groceries", 60000]]),
  tx("PAYMENT", "2026-11-06", "bank", [["card", 160000]]), // repays the card (1600.00), not an expense
  tx("PAYMENT", "2026-11-07", "bank", [["ploy", 20000]]), // lend 200.00, not an expense
];

describe("TEST-UNIT-26 monthlyReport", () => {
  const r = monthlyReport(accounts, txns, "2026-11-28", 3);

  it("one row per month, oldest first; the current month ends today", () => {
    expect(r.map((m) => [m.month, m.from, m.to])).toEqual([
      ["2026-09", "2026-09-01", "2026-09-30"], ["2026-10", "2026-10-01", "2026-10-31"], ["2026-11", "2026-11-01", "2026-11-28"],
    ]);
  });

  it("income / expense / net use only income and expense lines (AC-16-1, BR-12)", () => {
    expect(r[1]).toMatchObject({ income: 0, expense: 10000, net: -10000 });
    expect(r[2]).toMatchObject({ income: 3000000, expense: 150000, net: 2850000 });
    expect(r[0]).toMatchObject({ income: 0, expense: 0, net: 0, netPosition: 0 });
  });

  it("net position = cash + loans given − loans taken at month end (AC-16-2)", () => {
    expect(r[1].netPosition).toBe(-10000); // card owes 100.00
    // Nov: bank 5000 + 30000 − 1600 − 200 = 33200; card 100 + 1500 − 1600 = 0; ploy 200 → 33400.00
    expect(r[2].netPosition).toBe(3340000);
  });

  it("an opening balance dated after the month end is not counted (AC-16-3)", () => {
    expect(r[1].netPosition).toBe(-10000); // bank opening 15 Nov is not in October
  });

  it("year boundary: January report covers December of the previous year", () => {
    expect(monthlyReport(accounts, [], "2027-01-10", 2).map((m) => m.month)).toEqual(["2026-12", "2027-01"]);
  });

  it("parseMonths: default 6, 1–24 integers only (AC-16-4)", () => {
    expect(parseMonths(undefined)).toBe(6);
    expect(parseMonths("1")).toBe(1);
    expect(parseMonths("24")).toBe(24);
    for (const bad of ["0", "25", "abc", "2.5", "-1"]) expect(parseMonths(bad), bad).toBeNull();
  });
});
