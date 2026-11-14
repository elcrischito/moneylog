// F-07/F-08 summary and history — TEST-API-50, 60, 61
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";

const cleanup: string[] = [];
let token = "";
let bobToken = "";
let ids: Record<string, string> = {};
const created: Record<string, string> = {};

beforeAll(async () => {
  const { user, email } = await createTempUser("summary");
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  ids = Object.fromEntries((await prisma.financialAccount.findMany({ where: { ownerId: user.id } })).map((a) => [a.name, a.id]));
  token = await login(email);
  bobToken = await login("bob@moneylog.test");

  const post = async (key: string, body: object) => {
    const res = await request(app).post("/api/transactions").set(auth(token)).send(body);
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
    created[key] = res.body.transaction.id;
  };
  await request(app).put(`/api/accounts/${ids["Bangkok Bank Savings"]}/opening-balance`).set(auth(token)).send({ amount: "10000.00", date: "2026-11-01" });
  await post("salary", { kind: "RECEIPT", date: "2026-11-05", description: "November salary", accountId: ids["Bangkok Bank Savings"], total: "30000.00", lines: [{ accountId: ids["Salary"], amount: "30000.00" }] });
  await post("purchase", { kind: "PAYMENT", date: "2026-11-08", description: "Dinner and groceries", accountId: ids["KTC Credit Card"], total: "1500.00", lines: [{ accountId: ids["Dining"], amount: "900.00" }, { accountId: ids["Groceries"], amount: "600.00" }] });
  await post("repay", { kind: "PAYMENT", date: "2026-11-10", description: "Card repayment", accountId: ids["Bangkok Bank Savings"], total: "1500.00", lines: [{ accountId: ids["KTC Credit Card"], amount: "1500.00" }] });
  await post("borrow", { kind: "RECEIPT", date: "2026-11-11", description: "Borrowed + ATM", accountId: ids["Wallet"], total: "3000.00", lines: [{ accountId: ids["Loan from Mom"], amount: "2000.00" }, { accountId: ids["Bangkok Bank Savings"], amount: "1000.00" }] });
});
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-07/F-08 summary and history", () => {
  it("TEST-API-50: the summary counts only income and expense lines (AC-07-1, AC-07-2, AC-04-3)", async () => {
    const res = await request(app).get("/api/summary").query({ from: "2026-11-01", to: "2026-11-30" }).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      from: "2026-11-01", to: "2026-11-30",
      income: { total: "30000.00", byAccount: [{ accountId: ids["Salary"], name: "Salary", amount: "30000.00" }] },
      expense: { total: "1500.00", byAccount: [
        { accountId: ids["Dining"], name: "Dining", amount: "900.00" },
        { accountId: ids["Groceries"], name: "Groceries", amount: "600.00" }] },
      net: "28500.00",
    });
    const october = await request(app).get("/api/summary").query({ from: "2026-10-01", to: "2026-10-31" }).set(auth(token));
    expect(october.body.income.total).toBe("0.00");
    expect(october.body.net).toBe("0.00");
    const bad = await request(app).get("/api/summary").query({ from: "2026-11-30", to: "2026-11-01" }).set(auth(token));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("TEST-API-60: history lists own transactions newest first, with their lines (AC-08-1)", async () => {
    const res = await request(app).get("/api/transactions").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.transactions.map((t: { description: string }) => t.description)).toEqual([
      "Borrowed + ATM", "Card repayment", "Dinner and groceries", "November salary",
    ]);
    const purchase = res.body.transactions[2];
    expect(purchase).toMatchObject({ kind: "PAYMENT", date: "2026-11-08", total: "1500.00", account: { name: "KTC Credit Card" } });
    expect(purchase.lines.map((l: { account: { name: string }; amount: string }) => [l.account.name, l.amount])).toEqual([["Dining", "900.00"], ["Groceries", "600.00"]]);

    const one = await request(app).get(`/api/transactions/${created.purchase}`).set(auth(token));
    expect(one.status).toBe(200);
    expect(one.body.transaction.id).toBe(created.purchase);
  });

  it("TEST-API-61: another user sees none of these transactions and gets 404 on one (AC-08-2, BR-01)", async () => {
    const list = await request(app).get("/api/transactions").set(auth(bobToken));
    expect(list.status).toBe(200);
    const bobIds = list.body.transactions.map((t: { id: string }) => t.id);
    for (const id of Object.values(created)) expect(bobIds).not.toContain(id);
    const one = await request(app).get(`/api/transactions/${created.salary}`).set(auth(bobToken));
    expect(one.status).toBe(404);
    expect(JSON.stringify(one.body)).not.toContain("November salary");
    const bobSummary = await request(app).get("/api/summary").query({ from: "2026-11-01", to: "2026-11-30" }).set(auth(bobToken));
    expect(bobSummary.body.income.byAccount.map((x: { accountId: string }) => x.accountId)).not.toContain(ids["Salary"]);
  });
});
