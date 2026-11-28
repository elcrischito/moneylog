// TEST-E2E-30 (F-15) + F-14 in the browser: duplicate a transaction, original unchanged; mark a favorite and filter.
import { test, expect } from "@playwright/test";
import { resetDemoData, signIn } from "./helpers";

test("TEST-E2E-30: duplicate then favorite", async ({ page }) => {
  resetDemoData();
  await signIn(page, "alice@moneylog.test");
  await page.getByRole("link", { name: "New transaction" }).click();
  await page.getByLabel("Paid from").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Total (THB)").fill("250");
  await page.getByLabel("Description").fill("E2E-30 lunch");
  await page.getByLabel("Line 1 account").selectOption({ label: "Dining" });
  await page.getByLabel("Line 1 amount").fill("250");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction saved.");

  await page.getByTestId("history-row").filter({ hasText: "E2E-30 lunch" }).getByRole("link", { name: "Duplicate" }).click();
  await expect(page.getByTestId("duplicate-banner")).toContainText("E2E-30 lunch");
  await expect(page.getByLabel("Total (THB)")).toHaveValue("250.00");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction saved.");
  await expect(page.getByTestId("history-row").filter({ hasText: "E2E-30 lunch" })).toHaveCount(2);

  // F-14: mark one as favorite, then show favorites only
  await page.getByTestId("history-row").filter({ hasText: "E2E-30 lunch" }).first().getByRole("button", { name: /Add E2E-30 lunch .* to favorites/ }).click();
  await expect(page.getByRole("button", { name: /Remove E2E-30 lunch .* from favorites/ })).toHaveCount(1);
  await page.getByLabel("Favorites only").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("history-row")).toHaveCount(1);
  await expect(page.getByTestId("history-row")).toContainText("E2E-30 lunch");
});
