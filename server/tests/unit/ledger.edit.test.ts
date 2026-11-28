// F-11 — TEST-UNIT-22 validateTransaction with allowInactive (contract F-11 v1.1, AC-11-5)
import { describe, it, expect } from "vitest";
import { validateTransaction, type LedgerAccount } from "../../src/domain/ledger";

const acc = (id: string, type: LedgerAccount["type"], isActive = true, subtype: LedgerAccount["subtype"] = null): LedgerAccount => ({ id, type, subtype, openingBalance: 0, isActive });
const accounts = new Map([acc("bank", "CASH", true, "BANK"), acc("oldbank", "CASH", false, "BANK"), acc("dining", "EXPENSE", false), acc("pets", "EXPENSE", false), acc("groceries", "EXPENSE")].map((a) => [a.id, a]));
const body = (primary: string, lines: string[]) => ({ kind: "PAYMENT", date: "2026-11-20", accountId: primary, total: `${lines.length}.00`, description: "edit", lines: lines.map((id) => ({ accountId: id, amount: "1.00" })) });

describe("TEST-UNIT-22 validateTransaction allowInactive (F-11)", () => {
  it("without allowInactive an inactive line is ACCOUNT_NOT_FOUND (Sprint 1 behaviour kept)", () => {
    expect(validateTransaction(body("bank", ["dining"]), accounts, "2026-11-28")).toMatchObject({ ok: false, error: { code: "ACCOUNT_NOT_FOUND" } });
  });

  it("an inactive account in the role the original used it is accepted", () => {
    expect(validateTransaction(body("bank", ["dining", "groceries"]), accounts, "2026-11-28", { lines: new Set(["dining"]) })).toMatchObject({ ok: true });
    expect(validateTransaction(body("oldbank", ["groceries"]), accounts, "2026-11-28", { primary: "oldbank" })).toMatchObject({ ok: true });
  });

  it("a different inactive account, or the same one in another role, is refused", () => {
    expect(validateTransaction(body("bank", ["dining", "pets"]), accounts, "2026-11-28", { lines: new Set(["dining"]) })).toMatchObject({
      ok: false, error: { code: "ACCOUNT_NOT_FOUND", details: [{ field: "lines[1].accountId" }] },
    });
    expect(validateTransaction(body("bank", ["oldbank"]), accounts, "2026-11-28", { primary: "oldbank" })).toMatchObject({ ok: false, error: { code: "ACCOUNT_NOT_FOUND" } });
  });
});
