// TEST-UI-11 (F-10): two tables with captions, status as text, totals line.
import { render, screen, within } from "@testing-library/react";
import { LoansView } from "../src/pages/LoansPage";
import type { LoansResponse } from "../src/lib/types";

const data: LoansResponse = {
  taken: [
    { id: "c", name: "KTC Credit Card", subtype: "CREDIT_CARD", isActive: true, outstanding: "1500.00", openingBalance: "0.00", openingDate: null, lastActivity: "2026-11-27", status: "OPEN" },
    { id: "a", name: "Amex", subtype: "CREDIT_CARD", isActive: true, outstanding: "-0.50", openingBalance: "0.00", openingDate: null, lastActivity: "2026-11-26", status: "OVERPAID" },
  ],
  given: [{ id: "p", name: "Loan to Ploy", subtype: null, isActive: true, outstanding: "0.00", openingBalance: "2000.00", openingDate: "2026-11-01", lastActivity: null, status: "SETTLED" }],
  totals: { taken: "1499.50", given: "0.00", net: "-1499.50" },
};

describe("Loans page", () => {
  it("TEST-UI-11: renders both tables, statuses as text and the totals", () => {
    render(<LoansView data={data} />);
    const owe = screen.getByRole("table", { name: "I owe" });
    expect(within(owe).getAllByRole("row")).toHaveLength(3); // header + 2
    expect(within(owe).getByText("Open")).toBeInTheDocument();
    expect(within(owe).getByText("Overpaid")).toBeInTheDocument();
    const owed = screen.getByRole("table", { name: "Owed to me" });
    expect(within(owed).getByText("Settled")).toBeInTheDocument();
    expect(within(owed).getByText("2026-11-01")).toBeInTheDocument();
    expect(screen.getByText("Total I owe").nextSibling).toHaveTextContent("฿1,499.50");
    expect(screen.getByText("Net (owed to me − I owe)").nextSibling).toHaveTextContent("-฿1,499.50");
  });
});
