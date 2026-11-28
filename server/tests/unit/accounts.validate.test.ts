// F-09 — TEST-UNIT-20 validateNewAccount (contract F-09 v1.0)
import { describe, it, expect } from "vitest";
import { validateNewAccount, validateAccountName, nameKey } from "../../src/domain/accounts";

const TYPES = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"] as const;
const SUBTYPES = ["WALLET", "BANK", "CREDIT_CARD", "OTHER_LOAN", null] as const;
const VALID: Record<string, (string | null)[]> = {
  CASH: ["WALLET", "BANK"],
  LOAN_TAKEN: ["CREDIT_CARD", "OTHER_LOAN"],
  LOAN_GIVEN: [null],
  INCOME: [null],
  EXPENSE: [null],
};

describe("TEST-UNIT-20 validateNewAccount (BR-05, AC-09-2)", () => {
  it("name length boundaries after trimming: 0 and 61 refused, 1 and 60 accepted", () => {
    expect(validateAccountName("   ")).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(validateAccountName("")).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(validateAccountName("  a  ")).toEqual({ ok: true, value: "a" });
    expect(validateAccountName(" " + "x".repeat(60) + " ")).toEqual({ ok: true, value: "x".repeat(60) });
    expect(validateAccountName("x".repeat(61))).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(validateAccountName(42)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("the full 5 × 5 type/subtype matrix follows BR-05", () => {
    for (const type of TYPES) {
      for (const subtype of SUBTYPES) {
        const r = validateNewAccount({ name: "Test", type, subtype });
        if (VALID[type].includes(subtype)) expect(r, `${type}/${subtype}`).toEqual({ ok: true, value: { name: "Test", type, subtype } });
        else expect(r, `${type}/${subtype}`).toMatchObject({ ok: false, error: { code: "INVALID_SUBTYPE" } });
      }
    }
  });

  it("a missing subtype counts as null; an unknown type is a VALIDATION_ERROR", () => {
    expect(validateNewAccount({ name: "Rent", type: "EXPENSE" })).toEqual({ ok: true, value: { name: "Rent", type: "EXPENSE", subtype: null } });
    expect(validateNewAccount({ name: "Cash", type: "CASH" })).toMatchObject({ ok: false, error: { code: "INVALID_SUBTYPE" } });
    expect(validateNewAccount({ name: "X", type: "SAVINGS" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(validateNewAccount(null)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("nameKey compares case-insensitively after trimming", () => {
    expect(nameKey(" Groceries ")).toBe(nameKey("groceries"));
  });
});
