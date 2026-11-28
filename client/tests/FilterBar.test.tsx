// TEST-UI-13 (F-12): query string built from the filled fields only; Clear resets.
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { FilterBar, buildQuery } from "../src/components/FilterBar";
import type { Account } from "../src/lib/types";

const accounts: Account[] = [
  { id: "g1", name: "Groceries", type: "EXPENSE", subtype: null, openingBalance: "0.00", openingDate: null, balance: "0.00", isActive: true },
  { id: "d1", name: "Dining", type: "EXPENSE", subtype: null, openingBalance: "0.00", openingDate: null, balance: "0.00", isActive: false },
];

describe("History filter bar", () => {
  it("TEST-UI-13: Apply sends only filled fields, Enter submits, Clear resets", () => {
    const onApply = vi.fn();
    render(<FilterBar accounts={accounts} onApply={onApply} />);
    expect(screen.getByRole("option", { name: "Dining (inactive)" })).toBeInTheDocument(); // inactive accounts can be searched

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: " dinner " } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "PAYMENT" } });
    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "g1" } });
    fireEvent.change(screen.getByLabelText("Min total"), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenLastCalledWith("?accountId=g1&kind=PAYMENT&q=dinner&min=1500");

    fireEvent.submit(screen.getByRole("form", { name: "Filter transactions" }));
    expect(onApply).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onApply).toHaveBeenLastCalledWith("");
    expect(screen.getByLabelText("Text")).toHaveValue("");
    expect(screen.getByLabelText("Type")).toHaveValue("");
  });

  it("buildQuery returns an empty string when nothing is filled", () => {
    expect(buildQuery({ from: "", to: "", accountId: "", kind: "", q: "  ", min: "", max: "", favorite: "" })).toBe("");
    expect(buildQuery({ from: "", to: "", accountId: "", kind: "", q: "", min: "", max: "", favorite: "true" })).toBe("?favorite=true");
  });
});
