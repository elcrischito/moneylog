// TEST-UI-15 (F-14, AC-14-1): the star sends the opposite value; aria-pressed follows the server answer.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import { FavoriteButton } from "../src/components/FavoriteButton";
import type { Transaction } from "../src/lib/types";

afterEach(() => vi.restoreAllMocks());
const tx: Transaction = { id: "t1", kind: "PAYMENT", date: "2026-11-28", description: "Rent", total: "8000.00",
  account: { id: "b", name: "Bank", type: "CASH" }, lines: [], isFavorite: false, createdAt: "" };

describe("Favorite star", () => {
  it("TEST-UI-15: toggles with PUT and reflects the result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ transaction: { ...tx, isFavorite: true } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ transaction: { ...tx, isFavorite: false } }), { status: 200 }));
    render(<FavoriteButton tx={tx} />);
    const star = screen.getByRole("button", { name: "Add Rent of 2026-11-28 to favorites" });
    expect(star).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(star);
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove Rent of 2026-11-28 from favorites" })).toHaveAttribute("aria-pressed", "true"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/transactions/t1/favorite");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT", body: JSON.stringify({ isFavorite: true }) });

    fireEvent.click(screen.getByRole("button", { name: /Remove Rent/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Add Rent/ })).toHaveAttribute("aria-pressed", "false"));
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ isFavorite: false });
  });
});
