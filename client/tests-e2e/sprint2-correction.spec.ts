// TEST-E2E-20 (F-11): record → edit → delete through the UI; balances on Accounts follow each step.
import { test, expect, type Page } from "@playwright/test";
import { resetDemoData, signIn } from "./helpers";

async function balance(page: Page, name: string) {
  await page.getByRole("link", { name: "Dashboard" }).click();
  return (await page.getByTestId(`balance-${name}`).textContent())?.trim();
}

test("TEST-E2E-20: record, edit and delete a card purchase", async ({ page }) => {
  resetDemoData();
  await signIn(page, "alice@moneylog.test");
  const card0 = await balance(page, "KTC Credit Card");

  await page.getByRole("link", { name: "New transaction" }).click();
  await page.getByLabel("Paid from").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Total (THB)").fill("1500");
  await page.getByLabel("Description").fill("E2E-20 dinner");
  await page.getByLabel("Line 1 account").selectOption({ label: "Dining" });
  await page.getByLabel("Line 1 amount").fill("1500");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction saved.");

  const row = page.getByTestId("history-row").filter({ hasText: "E2E-20 dinner" });
  await row.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit transaction" })).toBeVisible();
  await expect(page.getByLabel("Total (THB)")).toHaveValue("1500.00");
  await page.getByLabel("Total (THB)").fill("1200");
  await page.getByLabel("Line 1 amount").fill("1200");
  await page.getByLabel("Description").fill("E2E-20 dinner corrected");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction updated.");
  await expect(page.getByTestId("history-row").filter({ hasText: "E2E-20 dinner corrected" })).toContainText("฿1,200.00");

  const toNumber = (s?: string) => Number((s ?? "").replace(/[฿,]/g, ""));
  expect(toNumber(await balance(page, "KTC Credit Card")) - toNumber(card0)).toBe(1200);

  await page.getByRole("link", { name: "History" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("history-row").filter({ hasText: "E2E-20 dinner corrected" }).getByRole("button", { name: /^Delete/ }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction deleted.");
  await expect(page.getByTestId("history-row").filter({ hasText: "E2E-20" })).toHaveCount(0);
  expect(await balance(page, "KTC Credit Card")).toBe(card0);
});
