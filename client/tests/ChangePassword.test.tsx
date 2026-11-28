// TEST-UI-18 (F-17, AC-17-4): confirmation mismatch is caught in the form; a server 400 is shown in role=alert.
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import { ChangePasswordPage } from "../src/pages/ChangePasswordPage";

afterEach(() => vi.restoreAllMocks());

describe("Change password", () => {
  it("TEST-UI-18: mismatch is refused without a request; server error and success are shown", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "INVALID_CURRENT_PASSWORD", message: "The current password is not correct." } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<ChangePasswordPage />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "oldpass2026" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "newpass2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "newpass2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("different");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "newpass2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("The current password is not correct.")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ currentPassword: "oldpass2026", newPassword: "newpass2026" });

    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "newpass2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Password changed.");
  });
});
