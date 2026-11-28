// TEST-UI-02 (AC-05-2): the form shows what is left to allocate and only enables Save at exactly 0.00.
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { TransactionForm } from "../src/components/TransactionForm";
import { todayIso } from "../src/lib/format";
import type { Account } from "../src/lib/types";

const a = (id: string, name: string, type: Account["type"], subtype: Account["subtype"] = null): Account => ({
  id, name, type, subtype, openingBalance: "0.00", openingDate: null, balance: "0.00", isActive: true,
});
const accounts = [a("card", "KTC Credit Card", "LOAN_TAKEN", "CREDIT_CARD"), a("bank", "Bangkok Bank Savings", "CASH", "BANK"),
  a("dining", "Dining", "EXPENSE"), a("groceries", "Groceries", "EXPENSE"), a("salary", "Salary", "INCOME")];

describe("Transaction form", () => {
  it("TEST-UI-02: tracks the remaining amount and blocks saving until lines equal the total", async () => {
    const onSubmit = vi.fn(async () => {});
    render(<TransactionForm accounts={accounts} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Paid from"), { target: { value: "card" } });
    fireEvent.change(screen.getByLabelText("Total (THB)"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("Line 1 account"), { target: { value: "dining" } });
    fireEvent.change(screen.getByLabelText("Line 1 amount"), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add line" }));
    fireEvent.change(screen.getByLabelText("Line 2 account"), { target: { value: "groceries" } });
    fireEvent.change(screen.getByLabelText("Line 2 amount"), { target: { value: "500" } });

    expect(screen.getByTestId("remaining")).toHaveTextContent("Remaining to allocate: ฿100.00");
    expect(screen.getByRole("button", { name: "Save transaction" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Line 2 amount"), { target: { value: "600" } });
    expect(screen.getByTestId("remaining")).toHaveTextContent("Remaining to allocate: ฿0.00");
    expect(screen.getByRole("button", { name: "Save transaction" })).toBeEnabled();

    // income accounts are not offered as payment lines (BR-08)
    expect(screen.queryByRole("option", { name: /Salary/ })).not.toBeInTheDocument();
  });

  it("TEST-UI-03 (#47 regression): the date picker offers no day after today (AC-05-6, BR-14)", () => {
    // Found by the independent UAT team on be84770 (UAT-02 step 4): the Date field had no maximum.
    render(<TransactionForm accounts={accounts} onSubmit={vi.fn(async () => {})} />);
    const date = screen.getByLabelText("Date");
    expect(date).toHaveAttribute("type", "date");
    expect(date).toHaveAttribute("max", todayIso());
    expect(date).toHaveValue(todayIso());
  });
});

// TEST-UI-12 (F-11, AC-11-1): the edit form is pre-filled and submits the edited body.
import { waitFor } from "@testing-library/react";
describe("Transaction form — edit (F-11)", () => {
  it("TEST-UI-12: pre-fills the original and sends the corrected payload", async () => {
    const onSubmit = vi.fn(async () => {});
    const inactiveDining = { ...accounts[2], isActive: false };
    const initial = { kind: "PAYMENT" as const, date: "2026-11-20", description: "Dinner and groceries", accountId: "card", total: "1500.00",
      lines: [{ accountId: "dining", amount: "900.00" }, { accountId: "groceries", amount: "600.00" }] };
    render(<TransactionForm accounts={[accounts[0], accounts[1], inactiveDining, accounts[3], accounts[4]]} initial={initial} onSubmit={onSubmit} />);

    expect(screen.getByLabelText("Paid from")).toHaveValue("card");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-20");
    expect(screen.getByLabelText("Line 1 account")).toHaveValue("dining"); // inactive but used by the original
    expect(screen.getAllByRole("option", { name: "Dining (inactive)" }).length).toBeGreaterThan(0);
    expect(screen.getByTestId("remaining")).toHaveTextContent("Remaining to allocate: ฿0.00");

    fireEvent.change(screen.getByLabelText("Total (THB)"), { target: { value: "1200.00" } });
    fireEvent.change(screen.getByLabelText("Line 1 amount"), { target: { value: "700.00" } });
    fireEvent.change(screen.getByLabelText("Line 2 amount"), { target: { value: "500.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save transaction" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ ...initial, total: "1200.00",
      lines: [{ accountId: "dining", amount: "700.00" }, { accountId: "groceries", amount: "500.00" }] }));
  });
});
