// TEST-UI-03 (AC-02-4): navigation depends on the role. (The API is the real protection: TEST-API-13.)
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "../src/App";

function signedInAs(role: "USER" | "ADMIN") {
  sessionStorage.setItem("moneylog.token", "a".repeat(64));
  const user = { id: "u1", email: `${role.toLowerCase()}@moneylog.test`, fullName: role === "ADMIN" ? "Nok Administrator" : "Alice Wong", role };
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url);
    const body = path.startsWith("/api/auth/me") ? { user } : path.startsWith("/api/admin/users") ? { users: [] } : {};
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

describe("Navigation by role", () => {
  it("TEST-UI-03a: an administrator sees only the Users link", async () => {
    signedInAs("ADMIN");
    window.history.pushState({}, "", "/admin/users");
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent("Users");
    for (const label of ["Dashboard", "Accounts", "New transaction", "History", "Summary"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
    expect(await screen.findByRole("heading", { name: /users/i })).toBeInTheDocument();
  });

  it("TEST-UI-03b: a user sees the financial links and no Users link", async () => {
    signedInAs("USER");
    window.history.pushState({}, "", "/");
    render(<App />);
    await screen.findByRole("navigation", { name: "Main" });
    for (const label of ["Dashboard", "Accounts", "New transaction", "History", "Summary"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  });
});
