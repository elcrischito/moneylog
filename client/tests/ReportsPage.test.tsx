// TEST-UI-17 (F-16, AC-16-1): one row per month with income, expense, net and net position.
import { render, screen } from "@testing-library/react";
import { ReportsView } from "../src/pages/ReportsPage";

describe("Reports page", () => {
  it("TEST-UI-17: renders the monthly rows, marks the partial month and negative values", () => {
    render(<ReportsView data={{ months: [
      { month: "2026-10", from: "2026-10-01", to: "2026-10-31", income: "0.00", expense: "100.00", net: "-100.00", netPosition: "-100.00" },
      { month: "2026-11", from: "2026-11-01", to: "2026-11-28", income: "30000.00", expense: "1500.00", net: "28500.00", netPosition: "28400.00" },
    ] }} />);
    const rows = screen.getAllByTestId("report-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("2026-10");
    expect(rows[0]).not.toHaveTextContent("(to");
    expect(rows[0].querySelectorAll("td.negative")).toHaveLength(2);
    expect(rows[1]).toHaveTextContent("2026-11 (to 2026-11-28)");
    expect(rows[1]).toHaveTextContent("฿30,000.00");
    expect(rows[1]).toHaveTextContent("฿28,500.00");
    expect(rows[1]).toHaveTextContent("฿28,400.00");
  });
});
