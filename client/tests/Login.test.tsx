// TEST-UI-01 (AC-01-2): a failed sign-in shows the server message and keeps the e-mail.
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { AuthProvider } from "../src/lib/auth";
import { LoginPage } from "../src/pages/LoginPage";

describe("Login page", () => {
  it("TEST-UI-01: shows the error and keeps the e-mail after a 401", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: "INVALID_CREDENTIALS", message: "Invalid e-mail or password." } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "alice@moneylog.test" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid e-mail or password.");
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue("alice@moneylog.test");
  });
});
