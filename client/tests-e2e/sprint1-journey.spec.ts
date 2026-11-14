// TEST-E2E-01 (AC-01-1, AC-01-4, AC-05-1, AC-06-1, AC-07-1, AC-08-1) and TEST-E2E-03 (NFR-09, mobile-360 project)
// The theme's Sprint 1 example, done through the browser by Alice.
import { test, expect, type Page } from "@playwright/test";
import { resetDemoData, signIn, expectNoHorizontalScroll } from "./helpers";

test.beforeEach(() => resetDemoData());

async function record(page: Page, opts: { kind: "PAYMENT" | "RECEIPT"; account: string; date: string; description: string; total: string; lines: [string, string][] }) {
  await page.getByRole("link", { name: "New transaction" }).click();
  await page.getByRole("tab", { name: opts.kind === "PAYMENT" ? "Make a payment" : "Receive money" }).click();
  await page.getByLabel(opts.kind === "PAYMENT" ? "Paid from" : "Received into").selectOption({ label: opts.account });
  await page.getByLabel("Date").fill(opts.date);
  await page.getByLabel("Total (THB)").fill(opts.total);
  await page.getByLabel("Description").fill(opts.description);
  for (let i = 0; i < opts.lines.length; i++) {
    if (i > 0) await page.getByRole("button", { name: "+ Add line" }).click();
    await page.getByLabel(`Line ${i + 1} account`).selectOption({ label: opts.lines[i][0] });
    await page.getByLabel(`Line ${i + 1} amount`).fill(opts.lines[i][1]);
  }
  await expect(page.getByTestId("remaining")).toHaveText("Remaining to allocate: ฿0.00");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction saved.");
}

test("TEST-E2E-01: opening balance → salary → split card purchase → card repayment, then balances, summary and history", async ({ page }) => {
  await signIn(page, "alice@moneylog.test");
  await expect(page.getByRole("navigation", { name: "Main" })).toContainText("Alice Wong · User");

  // F-04 opening balance on the bank account
  await page.getByRole("link", { name: "Accounts" }).click();
  await page.getByRole("button", { name: "Set opening balance for Bangkok Bank Savings" }).click();
  await page.getByLabel("Opening amount (THB)").fill("10000");
  await page.getByLabel("Opening date").fill("2026-11-01");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Opening ฿10,000.00 on 2026-11-01")).toBeVisible();

  // F-06 salary, F-05 split card purchase and card repayment
  await record(page, { kind: "RECEIPT", account: "Bangkok Bank Savings", date: "2026-11-05", description: "November salary", total: "30000", lines: [["Salary", "30000"]] });
  await record(page, { kind: "PAYMENT", account: "KTC Credit Card", date: "2026-11-08", description: "Dinner and groceries", total: "1500", lines: [["Dining", "900"], ["Groceries", "600"]] });
  await record(page, { kind: "PAYMENT", account: "Bangkok Bank Savings", date: "2026-11-10", description: "Card repayment", total: "1500", lines: [["KTC Credit Card", "1500"]] });

  // F-08 history: newest first, lines visible
  const rows = page.getByTestId("history-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Card repayment");
  await expect(rows.nth(2)).toContainText("November salary");
  await rows.nth(1).getByRole("button", { name: /Show lines/ }).click();
  await expect(page.getByText("↳ Dining")).toBeVisible();

  // F-03 balances
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByTestId("total-cash")).toHaveText("฿38,500.00");
  await expect(page.getByTestId("total-card-debt")).toHaveText("฿0.00");
  await expect(page.getByTestId("balance-Bangkok Bank Savings")).toContainText("฿38,500.00");

  // F-07 summary for November
  await page.getByRole("link", { name: "Summary" }).click();
  await page.getByLabel("From", { exact: true }).fill("2026-11-01");
  await page.getByLabel("To", { exact: true }).fill("2026-11-30");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByTestId("summary-income")).toHaveText("฿30,000.00");
  await expect(page.getByTestId("summary-expense")).toHaveText("฿1,500.00");
  await expect(page.getByTestId("summary-net")).toHaveText("฿28,500.00");
  await expectNoHorizontalScroll(page);

  // F-01 sign out: the protected pages are gone
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.goto("/summary");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("TEST-E2E-03: the main screens fit a 360 px wide screen without horizontal scrolling (NFR-09)", async ({ page }) => {
  await signIn(page, "alice@moneylog.test");
  for (const link of ["Dashboard", "Accounts", "New transaction", "History", "Summary"]) {
    await page.getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test("rule rejection in the browser: lines that do not add up cannot be saved (AC-05-2)", async ({ page }) => {
  await signIn(page, "alice@moneylog.test");
  await page.getByRole("link", { name: "New transaction" }).click();
  await page.getByLabel("Paid from").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Total (THB)").fill("1500");
  await page.getByLabel("Line 1 account").selectOption({ label: "Dining" });
  await page.getByLabel("Line 1 amount").fill("900");
  await page.getByRole("button", { name: "+ Add line" }).click();
  await page.getByLabel("Line 2 account").selectOption({ label: "Groceries" });
  await page.getByLabel("Line 2 amount").fill("500");
  await expect(page.getByTestId("remaining")).toHaveText("Remaining to allocate: ฿100.00");
  await expect(page.getByRole("button", { name: "Save transaction" })).toBeDisabled();
  // the server rejects the same input on its own (the UI check is only a convenience)
  const status = await page.evaluate(async () => {
    const accounts = await (await fetch("/api/accounts", { headers: { Authorization: `Bearer ${sessionStorage.getItem("moneylog.token")}` } })).json();
    const id = (n: string) => accounts.accounts.find((a: { name: string }) => a.name === n).id;
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("moneylog.token")}` },
      body: JSON.stringify({ kind: "PAYMENT", date: "2026-11-08", accountId: id("KTC Credit Card"), total: "1500.00",
        lines: [{ accountId: id("Dining"), amount: "900.00" }, { accountId: id("Groceries"), amount: "500.00" }] }),
    });
    return { status: res.status, code: (await res.json()).error.code };
  });
  expect(status).toEqual({ status: 400, code: "LINES_TOTAL_MISMATCH" });
});
