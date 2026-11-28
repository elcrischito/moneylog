// TEST-UI-16 (F-15, AC-15-1): /transactions/new?from=<id> pre-fills a copy dated today.
import { render, screen } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import { NewTransactionPage } from "../src/pages/NewTransactionPage";
import { todayIso } from "../src/lib/format";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});
const account = (id: string, name: string, type: string, isActive = true) => ({ id, name, type, subtype: null, openingBalance: "0.00", openingDate: null, balance: "0.00", isActive });

describe("New transaction — duplicate", () => {
  it("TEST-UI-16: pre-fills kind, account, total and lines, with today's date and a banner", async () => {
    window.history.pushState({}, "", "/transactions/new?from=t1");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/accounts") {
        return new Response(JSON.stringify({ accounts: [account("card", "KTC Credit Card", "LOAN_TAKEN"), account("dining", "Dining", "EXPENSE"), account("groceries", "Groceries", "EXPENSE")], totals: {} }), { status: 200 });
      }
      if (url === "/api/transactions/t1") {
        return new Response(JSON.stringify({ transaction: { id: "t1", kind: "PAYMENT", date: "2026-11-02", description: "Dinner and groceries", total: "1500.00", isFavorite: true, createdAt: "",
          account: { id: "card", name: "KTC Credit Card", type: "LOAN_TAKEN" },
          lines: [{ account: { id: "dining", name: "Dining", type: "EXPENSE" }, amount: "900.00" }, { account: { id: "groceries", name: "Groceries", type: "EXPENSE" }, amount: "600.00" }] } }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    render(<NewTransactionPage />);
    expect(await screen.findByTestId("duplicate-banner")).toHaveTextContent("Duplicated from 2026-11-02 Dinner and groceries");
    expect(screen.getByLabelText("Paid from")).toHaveValue("card");
    expect(screen.getByLabelText("Date")).toHaveValue(todayIso());
    expect(screen.getByLabelText("Total (THB)")).toHaveValue("1500.00");
    expect(screen.getByLabelText("Line 2 account")).toHaveValue("groceries");
    expect(screen.getByTestId("remaining")).toHaveTextContent("Remaining to allocate: ฿0.00");
    expect(screen.getByRole("button", { name: "Save transaction" })).toBeEnabled();
  });
});
