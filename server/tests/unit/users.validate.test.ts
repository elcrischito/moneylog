// F-17 — TEST-UNIT-27 checkPassword / validateNewUser (contract F-17 v1.0, AC-17-2)
import { describe, it, expect } from "vitest";
import { checkPassword, validateNewUser } from "../../src/domain/users";

describe("TEST-UNIT-27 password policy and new-user validation", () => {
  it("length 9 refused, 10 and 72 accepted, 73 refused; needs a letter and a digit", () => {
    expect(checkPassword("abcdefgh1")).toMatchObject({ ok: false, error: { code: "WEAK_PASSWORD" } });
    expect(checkPassword("abcdefghi1")).toEqual({ ok: true, value: "abcdefghi1" });
    expect(checkPassword("a".repeat(71) + "1")).toMatchObject({ ok: true });
    expect(checkPassword("a".repeat(72) + "1")).toMatchObject({ ok: false, error: { code: "WEAK_PASSWORD" } });
    expect(checkPassword("abcdefghijk")).toMatchObject({ ok: false, error: { code: "WEAK_PASSWORD" } }); // no digit
    expect(checkPassword("1234567890")).toMatchObject({ ok: false, error: { code: "WEAK_PASSWORD" } }); // no letter
    expect(checkPassword(1234567890)).toMatchObject({ ok: false, error: { code: "WEAK_PASSWORD" } });
  });

  it("validateNewUser: e-mail lower-cased and trimmed, name 1–100, password policy", () => {
    expect(validateNewUser({ email: "  Chai.Test@MoneyLog.test ", fullName: " Chai Test ", password: "chaipass2026" })).toEqual({
      ok: true, value: { email: "chai.test@moneylog.test", fullName: "Chai Test", password: "chaipass2026" },
    });
    expect(validateNewUser({ email: "not-an-email", fullName: "X", password: "chaipass2026" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", details: [{ field: "email" }] } });
    expect(validateNewUser({ email: "a@b.test", fullName: "   ", password: "chaipass2026" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", details: [{ field: "fullName" }] } });
    expect(validateNewUser({ email: "a@b.test", fullName: "x".repeat(101), password: "chaipass2026" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(validateNewUser({ email: "a@b.test", fullName: "A", password: "short1" })).toMatchObject({ ok: false, error: { code: "WEAK_PASSWORD" } });
  });
});
