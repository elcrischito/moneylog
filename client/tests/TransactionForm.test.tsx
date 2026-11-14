// TEST-UI-02 (AC-05-2): the form shows what is left to allocate and only enables Save at exactly 0.00.
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { TransactionForm } from "../src/components/TransactionForm";
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
});
