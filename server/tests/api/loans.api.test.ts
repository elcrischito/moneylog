// F-10 Loans overview — TEST-API-80..83 (contract F-10 v1.0)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok } from "../../src/domain/dates";

const cleanup: string[] = [];
const TODAY = todayInBangkok();

async function newUser(prefix: string) {
  const { user, email } = await createTempUser(prefix);
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  const accounts = await prisma.financialAccount.findMany({ where: { ownerId: user.id } });
  return { user, token: await login(email), ids: Object.fromEntries(accounts.map((a) => [a.name, a.id])) as Record<string, string> };
}
const post = (token: string, body: object) => request(app).post("/api/transactions").set(auth(token)).send(body);
const loans = (token: string) => request(app).get("/api/loans").set(auth(token));
const row = (body: { taken: { name: string }[]; given: { name: string }[] }, name: string) => [...body.taken, ...body.given].find((r) => r.name === name);

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-10 loans overview", () => {
  it("TEST-API-80: card 1500.00 OPEN after the purchase, 0.00 SETTLED after repayment (AC-10-1)", async () => {
    const u = await newUser("loan80");
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["KTC Credit Card"], total: "1500.00",
      lines: [{ accountId: u.ids["Dining"], amount: "900.00" }, { accountId: u.ids["Groceries"], amount: "600.00" }] });
    const open = await loans(u.token);
    expect(open.status).toBe(200);
    expect(row(open.body, "KTC Credit Card")).toMatchObject({ outstanding: "1500.00", status: "OPEN", subtype: "CREDIT_CARD", lastActivity: TODAY });
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "1500.00", lines: [{ accountId: u.ids["KTC Credit Card"], amount: "1500.00" }] });
    expect(row((await loans(u.token)).body, "KTC Credit Card")).toMatchObject({ outstanding: "0.00", status: "SETTLED" });
  });

  it("TEST-API-81: Loan to Ploy opening 2000.00 minus a 500.00 receipt = 1500.00; totals and net (AC-10-2)", async () => {
    const u = await newUser("loan81");
    await request(app).put(`/api/accounts/${u.ids["Loan to Ploy"]}/opening-balance`).set(auth(u.token)).send({ amount: "2000.00", date: "2026-11-01" });
    await post(u.token, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "500.00", lines: [{ accountId: u.ids["Loan to Ploy"], amount: "500.00" }] });
    const res = await loans(u.token);
    expect(res.body.given).toEqual([expect.objectContaining({ name: "Loan to Ploy", outstanding: "1500.00", openingBalance: "2000.00", openingDate: "2026-11-01", status: "OPEN" })]);
    expect(res.body.totals).toEqual({ taken: "0.00", given: "1500.00", net: "1500.00" });
  });

  it("TEST-API-82: overpaying the card by 0.50 shows -0.50 OVERPAID and counts in totals (AC-10-3)", async () => {
    const u = await newUser("loan82");
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["KTC Credit Card"], total: "1500.00", lines: [{ accountId: u.ids["Dining"], amount: "1500.00" }] });
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "1500.50", lines: [{ accountId: u.ids["KTC Credit Card"], amount: "1500.50" }] });
    const res = await loans(u.token);
    expect(row(res.body, "KTC Credit Card")).toMatchObject({ outstanding: "-0.50", status: "OVERPAID" });
    expect(res.body.totals).toEqual({ taken: "-0.50", given: "0.00", net: "0.50" });
  });

  it("TEST-API-83: own loans only, no cash/income/expense rows; the Administrator gets 403 (AC-10-5)", async () => {
    const alice = await newUser("loan83a");
    const bob = await newUser("loan83b");
    await request(app).put(`/api/accounts/${alice.ids["Loan to Ploy"]}/opening-balance`).set(auth(alice.token)).send({ amount: "777.00", date: "2026-11-01" });
    const res = await loans(bob.token);
    expect(res.status).toBe(200);
    const ids = [...res.body.taken, ...res.body.given].map((r: { id: string }) => r.id);
    expect(ids.every((id: string) => Object.values(bob.ids).includes(id))).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("777.00");
    expect(JSON.stringify(res.body)).not.toMatch(/Wallet|Dining|Salary/);
    expect([...res.body.taken, ...res.body.given].length).toBe(3); // KTC, Loan from Mom, Loan to Ploy
    const admin = await login("admin@moneylog.test");
    expect((await loans(admin)).status).toBe(403);
  });
});
