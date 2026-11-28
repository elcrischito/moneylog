// TEST-UI-10 (F-09, AC-09-1, AC-09-3): add form, subtype select only for Cash / Loan taken, server error shown.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import { AddAccountForm } from "../src/pages/AccountsPage";

afterEach(() => vi.restoreAllMocks());

describe("Accounts page — add account", () => {
  it("TEST-UI-10: shows the subtype for Cash, sends the body, and shows a 409 in role=alert", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ account: {} }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "ACCOUNT_NAME_TAKEN", message: "You already have an account with this name." } }), { status: 409 }));
    const onDone = vi.fn();
    render(<AddAccountForm onDone={onDone} />);

    expect(screen.queryByLabelText("Subtype")).not.toBeInTheDocument(); // default type EXPENSE: no subtype (BR-05)
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "CASH" } });
    fireEvent.change(screen.getByLabelText("Subtype"), { target: { value: "BANK" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Kasikorn Savings" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/accounts");
    expect(JSON.parse(init!.body as string)).toEqual({ name: "Kasikorn Savings", type: "CASH", subtype: "BANK" });

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "EXPENSE" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "groceries" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have an account with this name.");
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ name: "groceries", type: "EXPENSE", subtype: null });
  });
});
