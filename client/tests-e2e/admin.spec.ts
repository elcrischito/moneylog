// TEST-E2E-02 (AC-02-2, AC-02-4): the administrator manages access but cannot reach financial data.
import { test, expect } from "@playwright/test";
import { resetDemoData, signIn, PASSWORD } from "./helpers";

test.beforeEach(() => resetDemoData());

test("TEST-E2E-02: admin disables Bob, Bob cannot sign in, the admin gets 403 on financial data, then re-enables Bob", async ({ page, browser }) => {
  await signIn(page, "admin@moneylog.test");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  // F-17 contract v1.0 adds "Change password" for every role; the admin still has no financial link (BR-02).
  await expect(nav.getByRole("link")).toHaveText(["Users", "Password"]);

  await page.getByRole("button", { name: "Disable Bob Chen" }).click();
  await expect(page.getByRole("row", { name: /Bob Chen/ })).toContainText("Disabled");

  // Bob, in another browser context, is refused
  const other = await browser.newContext();
  const bobPage = await other.newPage();
  await bobPage.goto("/login");
  await bobPage.getByLabel("E-mail").fill("bob@moneylog.test");
  await bobPage.getByLabel("Password").fill(PASSWORD);
  await bobPage.getByRole("button", { name: "Sign in" }).click();
  await expect(bobPage.getByRole("alert")).toHaveText("Invalid e-mail or password.");
  await other.close();

  // The admin's own session is refused by the API on financial routes (BR-02)
  const results = await page.evaluate(async () => {
    const h = { Authorization: `Bearer ${sessionStorage.getItem("moneylog.token")}` };
    const out: Record<string, number> = {};
    for (const p of ["/api/accounts", "/api/transactions", "/api/summary"]) out[p] = (await fetch(p, { headers: h })).status;
    return out;
  });
  expect(results).toEqual({ "/api/accounts": 403, "/api/transactions": 403, "/api/summary": 403 });

  // Typing a financial URL just brings the admin back to Users
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

  await page.getByRole("button", { name: "Enable Bob Chen" }).click();
  await expect(page.getByRole("row", { name: /Bob Chen/ })).toContainText("Enabled");
});
