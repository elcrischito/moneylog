// Domain unit tests for F-05/F-06 — TEST-UNIT-01, 02, 03, 07
// Contract: docs/sprints/sprint-1/F-05-F-06-record-transactions.md
import { describe, it, expect } from "vitest";
import { parseMoney } from "../../src/domain/money";
import { validateTransaction, type LedgerAccount } from "../../src/domain/ledger";

const TODAY = "2026-11-14";
const acc = (id: string, type: LedgerAccount["type"], subtype: LedgerAccount["subtype"] = null, isActive = true): LedgerAccount => ({
  id, type, subtype, openingBalance: 0, isActive,
});
const accounts = new Map(
  [
    acc("bank", "CASH", "BANK"),
    acc("wallet", "CASH", "WALLET"),
    acc("card", "LOAN_TAKEN", "CREDIT_CARD"),
    acc("ploy", "LOAN_GIVEN"),
    acc("salary", "INCOME"),
    acc("dining", "EXPENSE"),
    acc("groceries", "EXPENSE"),
    acc("old", "EXPENSE", null, false),
  ].map((a) => [a.id, a]),
);
const payment = (over: object = {}) => ({
  kind: "PAYMENT", date: TODAY, description: "Dinner and groceries", accountId: "card", total: "1500.00",
  lines: [{ accountId: "dining", amount: "900.00" }, { accountId: "groceries", amount: "600.00" }], ...over,
});
const code = (input: unknown) => {
  const r = validateTransaction(input, accounts, TODAY);
  return r.ok ? "OK" : r.error.code;
};

describe("TEST-UNIT-01 allocation lines must equal the total (BR-06, AC-05-2)", () => {
  it("accepts lines that add up exactly and returns satang", () => {
    const r = validateTransaction(payment(), accounts, TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ total: 150000, lines: [{ accountId: "dining", amount: 90000 }, { accountId: "groceries", amount: 60000 }] });
  });
  it("rejects lines that are 1 satang short or over", () => {
    expect(code(payment({ lines: [{ accountId: "dining", amount: "900.00" }, { accountId: "groceries", amount: "599.99" }] }))).toBe("LINES_TOTAL_MISMATCH");
    expect(code(payment({ lines: [{ accountId: "dining", amount: "900.00" }, { accountId: "groceries", amount: "600.01" }] }))).toBe("LINES_TOTAL_MISMATCH");
  });
});

describe("TEST-UNIT-02 amounts and line count (BR-07, NFR-04, AC-05-3)", () => {
  it("parses money without floating-point error", () => {
    const a = parseMoney("0.10"), b = parseMoney("0.20");
    expect(a.ok && b.ok && a.value + b.value).toBe(30);
    expect(code(payment({ total: "0.30", lines: [{ accountId: "dining", amount: "0.10" }, { accountId: "groceries", amount: "0.20" }] }))).toBe("OK");
  });
  it("rejects zero, negative, 3 decimals, text and amounts above 9,999,999.99", () => {
    for (const bad of ["0", "0.00", "-5", "1.234", "abc", "10000000.00", "1e3"]) {
      expect(code(payment({ total: bad })), bad).toBe("INVALID_AMOUNT");
    }
    expect(code(payment({ total: "9999999.99", lines: [{ accountId: "dining", amount: "9999999.99" }] }))).toBe("OK");
    expect(code(payment({ lines: [{ accountId: "dining", amount: "1500.00" }, { accountId: "groceries", amount: "0" }] }))).toBe("INVALID_AMOUNT");
  });
  it("needs 1 to 20 lines", () => {
    expect(code(payment({ lines: [] }))).toBe("INVALID_LINE_COUNT");
    const lines = (n: number) => Array.from({ length: n }, () => ({ accountId: "dining", amount: "1.00" }));
    expect(code(payment({ total: "20.00", lines: lines(20) }))).toBe("OK");
    expect(code(payment({ total: "21.00", lines: lines(21) }))).toBe("INVALID_LINE_COUNT");
  });
});

describe("TEST-UNIT-03 allowed account types and ownership (BR-08, BR-09, BR-10)", () => {
  it("payment: paying account must be CASH or LOAN_TAKEN; INCOME lines are not allowed (AC-05-4)", () => {
    expect(code(payment({ accountId: "bank" }))).toBe("OK");
    for (const src of ["salary", "dining", "ploy"]) expect(code(payment({ accountId: src })), src).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
    expect(code(payment({ total: "100.00", lines: [{ accountId: "salary", amount: "100.00" }] }))).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
    // repayment of the card, money lent and transfer are allowed payment lines
    expect(code(payment({ accountId: "bank", total: "300.00", lines: [
      { accountId: "card", amount: "100.00" }, { accountId: "ploy", amount: "100.00" }, { accountId: "wallet", amount: "100.00" }] }))).toBe("OK");
  });
  it("receipt: receiving account must be CASH; EXPENSE lines are not allowed (AC-06-2)", () => {
    const receipt = (over: object) => ({ kind: "RECEIPT", date: TODAY, accountId: "bank", total: "100.00", lines: [{ accountId: "salary", amount: "100.00" }], ...over });
    expect(code(receipt({}))).toBe("OK");
    expect(code(receipt({ accountId: "card" }))).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
    expect(code(receipt({ lines: [{ accountId: "dining", amount: "100.00" }] }))).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
    expect(code(receipt({ accountId: "wallet", total: "300.00", lines: [
      { accountId: "ploy", amount: "100.00" }, { accountId: "card", amount: "100.00" }, { accountId: "bank", amount: "100.00" }] }))).toBe("OK");
  });
  it("unknown, other users' (not in the map) and inactive accounts are not found; a line cannot use the primary account (AC-05-5)", () => {
    expect(code(payment({ accountId: "someone-else" }))).toBe("ACCOUNT_NOT_FOUND");
    expect(code(payment({ total: "10.00", lines: [{ accountId: "someone-else", amount: "10.00" }] }))).toBe("ACCOUNT_NOT_FOUND");
    expect(code(payment({ total: "10.00", lines: [{ accountId: "old", amount: "10.00" }] }))).toBe("ACCOUNT_NOT_FOUND");
    expect(code(payment({ accountId: "bank", total: "10.00", lines: [{ accountId: "bank", amount: "10.00" }] }))).toBe("LINE_USES_PRIMARY_ACCOUNT");
  });
  it("rejects a malformed body with VALIDATION_ERROR and field details", () => {
    const r = validateTransaction({ kind: "GIFT", lines: "x" }, accounts, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION_ERROR");
      expect(r.error.details?.map((d) => d.field)).toEqual(expect.arrayContaining(["kind", "accountId", "date", "lines"]));
    }
    expect(code(payment({ description: "x".repeat(201) }))).toBe("VALIDATION_ERROR");
  });
});

describe("TEST-UNIT-07 date not in the future (BR-14, AC-05-6)", () => {
  it("accepts today and past dates and rejects tomorrow", () => {
    expect(code(payment({ date: TODAY }))).toBe("OK");
    expect(code(payment({ date: "2026-01-01" }))).toBe("OK");
    expect(code(payment({ date: "2026-11-15" }))).toBe("DATE_IN_FUTURE");
  });
});
