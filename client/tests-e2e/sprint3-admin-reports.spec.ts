// TEST-E2E-31 (F-17 + F-16): the admin creates a user; the user signs in, changes the password,
// records a salary and sees it in the monthly report.
import { test, expect } from "@playwright/test";
import { resetDemoData, signIn, expectNoHorizontalScroll } from "./helpers";

test("TEST-E2E-31: admin creates a user, the user changes the password and reads the report", async ({ page }, info) => {
  resetDemoData();
  const email = `e2e.${info.project.name}.${Date.now()}@moneylog.test`;
  await signIn(page, "admin@moneylog.test");
  await page.getByLabel("Full name").fill("E2E Chai");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Initial password").fill("chaipass2026");
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("status")).toContainText(`User ${email} created.`);
  await expect(page.getByRole("cell", { name: email })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signIn(page, email, "chaipass2026");
  await page.getByRole("link", { name: "Password" }).click();
  await page.getByLabel("Current password").fill("chaipass2026");
  await page.getByLabel("New password", { exact: true }).fill("chainew2027");
  await page.getByLabel("Confirm new password").fill("chainew2027");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toHaveText("Password changed.");
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, email, "chainew2027");

  await page.getByRole("link", { name: "New transaction" }).click();
  await page.getByRole("tab", { name: "Receive money" }).click();
  await page.getByLabel("Received into").selectOption({ label: "Bangkok Bank Savings" });
  await page.getByLabel("Total (THB)").fill("30000");
  await page.getByLabel("Line 1 account").selectOption({ label: "Salary" });
  await page.getByLabel("Line 1 amount").fill("30000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("status")).toHaveText("Transaction saved.");

  await page.getByRole("link", { name: "Reports" }).click();
  const current = page.getByTestId("report-row").last();
  await expect(current).toContainText("฿30,000.00");
  await expectNoHorizontalScroll(page);
});
