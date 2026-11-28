// F-12 — TEST-UNIT-23 parseTransactionFilter (contract F-12 v1.0)
import { describe, it, expect } from "vitest";
import { parseTransactionFilter } from "../../src/domain/filter";

const UUID = "3f2a8629-1b2c-4d5e-8f90-123456789abc";
const fields = (r: ReturnType<typeof parseTransactionFilter>) => (r.ok ? [] : (r.error.details ?? []).map((d) => d.field));

describe("TEST-UNIT-23 parseTransactionFilter", () => {
  it("parses a full valid query; money in satang; q trimmed", () => {
    expect(parseTransactionFilter({ from: "2026-11-01", to: "2026-11-30", accountId: UUID, kind: "PAYMENT", q: "  dinner ", min: "0", max: "1500.5", limit: "20" })).toEqual({
      ok: true, value: { from: "2026-11-01", to: "2026-11-30", accountId: UUID, kind: "PAYMENT", q: "dinner", min: 0, max: 150050, limit: 20 },
    });
  });

  it("empty query → default limit only; empty strings are ignored", () => {
    expect(parseTransactionFilter({})).toEqual({ ok: true, value: { limit: 50 } });
    expect(parseTransactionFilter({ q: "", min: "", from: "" })).toEqual({ ok: true, value: { limit: 50 } });
  });

  it("inclusive boundaries are valid: from = to, min = max", () => {
    expect(parseTransactionFilter({ from: "2026-11-27", to: "2026-11-27", min: "1500.00", max: "1500.00" })).toMatchObject({ ok: true, value: { min: 150000, max: 150000 } });
  });

  it("each invalid parameter names its field (AC-12-4)", () => {
    const cases: [Record<string, string>, string][] = [
      [{ from: "2026-11-30", to: "2026-11-01" }, "from"],
      [{ min: "10", max: "9.99" }, "min"],
      [{ kind: "TRANSFER" }, "kind"],
      [{ q: "x".repeat(101) }, "q"],
      [{ min: "1.234" }, "min"],
      [{ max: "-1" }, "max"],
      [{ from: "2026-02-30" }, "from"],
      [{ accountId: "not-a-uuid" }, "accountId"],
      [{ limit: "201" }, "limit"],
    ];
    for (const [q, field] of cases) {
      const r = parseTransactionFilter(q);
      expect(r, JSON.stringify(q)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect(fields(r)).toContain(field);
    }
    expect(parseTransactionFilter({ q: "x".repeat(100) })).toMatchObject({ ok: true });
  });
});
