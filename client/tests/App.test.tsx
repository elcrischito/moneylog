import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("App shell", () => {
  it("renders the product name", () => {
    render(<App />);
    expect(screen.getAllByText(/MoneyLog/i).length).toBeGreaterThan(0);
  });
});
