// TEST-UNIT-UI-16 duplicatePayload (F-15, AC-15-1, AC-15-3)
import { duplicatePayload } from "../src/lib/duplicate";
import type { Account, Transaction } from "../src/lib/types";

const a = (id: string, name: string, type: Account["type"], isActive = true): Account => ({ id, name, type, subtype: null, openingBalance: "0.00", openingDate: null, balance: "0.00", isActive });
const t: Transaction = {
  id: "t1", kind: "PAYMENT", date: "2026-11-02", description: "Dinner and groceries", total: "1500.00", isFavorite: true, createdAt: "",
  account: { id: "card", name: "KTC Credit Card", type: "LOAN_TAKEN" },
  lines: [{ account: { id: "dining", name: "Dining", type: "EXPENSE" }, amount: "900.00" }, { account: { id: "groceries", name: "Groceries", type: "EXPENSE" }, amount: "600.00" }],
};

describe("TEST-UNIT-UI-16 duplicatePayload", () => {
  it("copies kind, account, description, total and lines with today's date", () => {
    const accounts = [a("card", "KTC", "LOAN_TAKEN"), a("dining", "Dining", "EXPENSE"), a("groceries", "Groceries", "EXPENSE")];
    expect(duplicatePayload(t, accounts, "2026-11-28")).toEqual({
      payload: { kind: "PAYMENT", date: "2026-11-28", description: "Dinner and groceries", accountId: "card", total: "1500.00",
        lines: [{ accountId: "dining", amount: "900.00" }, { accountId: "groceries", amount: "600.00" }] },
      dropped: 0,
    });
  });

  it("clears accounts that are now inactive or unknown and counts them", () => {
    const accounts = [a("card", "KTC", "LOAN_TAKEN", false), a("dining", "Dining", "EXPENSE", false), a("groceries", "Groceries", "EXPENSE")];
    const r = duplicatePayload(t, accounts, "2026-11-28");
    expect(r.payload.accountId).toBe("");
    expect(r.payload.lines).toEqual([{ accountId: "", amount: "900.00" }, { accountId: "groceries", amount: "600.00" }]);
    expect(r.dropped).toBe(2);
  });
});
