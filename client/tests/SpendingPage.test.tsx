// TEST-UI-14 (F-13): rows, share text, bar width style, total; empty message.
import { render, screen } from "@testing-library/react";
import { SpendingView } from "../src/pages/SpendingPage";

describe("Spending page", () => {
  it("TEST-UI-14: renders rows with share text and bar width, and the total", () => {
    render(<SpendingView data={{ from: "2026-11-01", to: "2026-11-30", total: "1500.00", categories: [
      { accountId: "d", name: "Dining", amount: "900.00", share: "60.0" },
      { accountId: "g", name: "Groceries", amount: "600.00", share: "40.0" },
    ] }} />);
    const rows = screen.getAllByTestId("spending-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Dining");
    expect(rows[0]).toHaveTextContent("฿900.00");
    expect(rows[0]).toHaveTextContent("60.0%");
    expect(rows[0].querySelector(".bar-fill")).toHaveStyle({ width: "60.0%" });
    expect(screen.getByTestId("spending-total")).toHaveTextContent("฿1,500.00");
  });

  it("shows the empty message and a 0.00 total", () => {
    render(<SpendingView data={{ from: "2026-01-01", to: "2026-01-31", total: "0.00", categories: [] }} />);
    expect(screen.getByText("No spending in this period.")).toBeInTheDocument();
    expect(screen.getByTestId("spending-total")).toHaveTextContent("฿0.00");
  });
});
