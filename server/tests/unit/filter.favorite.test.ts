// F-14 — TEST-UNIT-25 parseTransactionFilter favorite (contract F-14 v1.0, AC-14-3)
import { describe, it, expect } from "vitest";
import { parseTransactionFilter } from "../../src/domain/filter";

describe("TEST-UNIT-25 favorite filter", () => {
  it("true / false are parsed, empty is ignored", () => {
    expect(parseTransactionFilter({ favorite: "true" })).toEqual({ ok: true, value: { favorite: true, limit: 50 } });
    expect(parseTransactionFilter({ favorite: "false" })).toEqual({ ok: true, value: { favorite: false, limit: 50 } });
    expect(parseTransactionFilter({ favorite: "" })).toEqual({ ok: true, value: { limit: 50 } });
  });

  it("anything else is a VALIDATION_ERROR on field favorite", () => {
    for (const v of ["yes", "1", "TRUE "]) {
      const r = parseTransactionFilter({ favorite: v });
      expect(r, v).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", details: [{ field: "favorite" }] } });
    }
  });
});
