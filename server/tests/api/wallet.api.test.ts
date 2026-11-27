// CR-01 / BR-15 v2 — TEST-API-37..39
// Contract: docs/sprints/sprint-1/F-05-F-06-record-transactions.md v1.1
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok, toDbDate } from "../../src/domain/dates";

const cleanup: string[] = [];
const TODAY = todayInBangkok();

async function newUser(prefix: string) {
  const { user, email } = await createTempUser(prefix);
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  const accounts = await prisma.financialAccount.findMany({ where: { ownerId: user.id } });
  return { user, token: await login(email), ids: Object.fromEntries(accounts.map((a) => [a.name, a.id])) };
}
const post = (token: string, body: object) => request(app).post("/api/transactions").set(auth(token)).send(body);
const pay = (from: string, to: string, amount: string) => ({ kind: "PAYMENT", date: TODAY, accountId: from, total: amount, lines: [{ accountId: to, amount }] });
async function balances(token: string): Promise<Record<string, string>> {
  const res = await request(app).get("/api/accounts").set(auth(token));
  return Object.fromEntries(res.body.accounts.map((a: { name: string; balance: string }) => [a.name, a.balance]));
}
const count = (ownerId: string) => prisma.transaction.count({ where: { ownerId } });

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("CR-01 a wallet can no longer go below zero (BR-15 v2)", () => {
  it("TEST-API-37: 500.01 from a 500.00 wallet is refused and stores nothing; 500.00 leaves 0.00 (AC-05-7)", async () => {
    const u = await newUser("wallet37");
    await request(app).put(`/api/accounts/${u.ids["Wallet"]}/opening-balance`).set(auth(u.token)).send({ amount: "500.00", date: "2026-11-01" });
    const before = await balances(u.token);

    const over = await post(u.token, pay(u.ids["Wallet"], u.ids["Dining"], "500.01"));
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe("INSUFFICIENT_WALLET_FUNDS");
    expect(JSON.stringify(over.body.error.details)).toContain("500.00");
    expect(await count(u.user.id)).toBe(0);
    expect(await balances(u.token)).toEqual(before);

    const exact = await post(u.token, pay(u.ids["Wallet"], u.ids["Dining"], "500.00"));
    expect(exact.status).toBe(201);
    expect(await balances(u.token)).toMatchObject({ Wallet: "0.00", Dining: "500.00" });
  });

  it("TEST-API-38: bank overdraft kept; an old negative wallet can receive but not overspend (AC-05-8)", async () => {
    const u = await newUser("wallet38");
    expect((await post(u.token, pay(u.ids["Bangkok Bank Savings"], u.ids["Telecom"], "100.00"))).status).toBe(201);
    expect((await balances(u.token))["Bangkok Bank Savings"]).toBe("-100.00");

    // Data recorded before CR-01 (BR-15 v1): written directly, as the old rule allowed it.
    await prisma.transaction.create({
      data: { ownerId: u.user.id, kind: "PAYMENT", date: toDbDate("2026-11-20"), description: "before CR-01", totalAmount: 130,
        primaryAccountId: u.ids["Wallet"], lines: { create: [{ accountId: u.ids["Dining"], amount: 130, position: 0 }] } },
    });
    expect((await balances(u.token)).Wallet).toBe("-1.30");

    const receive = await post(u.token, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Wallet"], total: "10.00", lines: [{ accountId: u.ids["Salary"], amount: "10.00" }] });
    expect(receive.status).toBe(201);
    expect((await balances(u.token)).Wallet).toBe("8.70");

    const over = await post(u.token, pay(u.ids["Wallet"], u.ids["Dining"], "8.71"));
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe("INSUFFICIENT_WALLET_FUNDS");
    expect((await post(u.token, pay(u.ids["Wallet"], u.ids["Dining"], "8.70"))).status).toBe(201);
    expect((await balances(u.token)).Wallet).toBe("0.00");
  });

  it("TEST-API-39: transfer out of the wallet is guarded; ownership and roles unchanged (AC-06-4, AC-05-9)", async () => {
    const u = await newUser("wallet39");
    await request(app).put(`/api/accounts/${u.ids["Wallet"]}/opening-balance`).set(auth(u.token)).send({ amount: "300.00", date: "2026-11-01" });
    const transfer = (amount: string) => ({ kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: amount, lines: [{ accountId: u.ids["Wallet"], amount }] });

    const over = await post(u.token, transfer("300.01"));
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe("INSUFFICIENT_WALLET_FUNDS");
    expect(await count(u.user.id)).toBe(0);
    expect((await post(u.token, transfer("300.00"))).status).toBe(201);
    expect(await balances(u.token)).toMatchObject({ Wallet: "0.00", "Bangkok Bank Savings": "300.00" });

    // Another user cannot use this wallet: ownership is checked before funds, so no balance is revealed.
    const other = await newUser("wallet39b");
    const steal = await post(other.token, pay(u.ids["Wallet"], other.ids["Dining"], "1.00"));
    expect(steal.status).toBe(400);
    expect(steal.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    expect(JSON.stringify(steal.body)).not.toContain("INSUFFICIENT");

    const admin = await login("admin@moneylog.test");
    expect((await post(admin, pay(u.ids["Wallet"], u.ids["Dining"], "1.00"))).status).toBe(403);
  });
});
