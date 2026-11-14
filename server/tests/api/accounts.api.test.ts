// F-03/F-04 accounts and opening balance — TEST-API-20..23
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";

const cleanup: string[] = [];
let token = "";
let bobToken = "";
let userId = "";

beforeAll(async () => {
  const { user, email } = await createTempUser("accounts");
  cleanup.push(user.id);
  userId = user.id;
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  token = await login(email);
  bobToken = await login("bob@moneylog.test");
});
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

const accountId = async (name: string) =>
  (await prisma.financialAccount.findFirstOrThrow({ where: { ownerId: userId, name } })).id;

describe("F-03/F-04 accounts and opening balance", () => {
  it("TEST-API-20: lists the user's own accounts of every type with derived balances and totals (AC-03-1, AC-03-2)", async () => {
    const res = await request(app).get("/api/accounts").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(STARTER_ACCOUNTS.length);
    expect(new Set(res.body.accounts.map((a: { type: string }) => a.type))).toEqual(
      new Set(["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"]),
    );
    expect(res.body.accounts[0]).toMatchObject({ type: "CASH", balance: "0.00", openingBalance: "0.00", openingDate: null });
    expect(res.body.totals).toEqual({ cash: "0.00", creditCardDebt: "0.00", loansTaken: "0.00", loansGiven: "0.00" });
  });

  it("TEST-API-21: setting an opening balance updates the balance, and setting it again replaces it (AC-04-1)", async () => {
    const bank = await accountId("Bangkok Bank Savings");
    const first = await request(app).put(`/api/accounts/${bank}/opening-balance`).set(auth(token)).send({ amount: "10000.00", date: "2026-11-01" });
    expect(first.status).toBe(200);
    expect(first.body.account).toMatchObject({ openingBalance: "10000.00", openingDate: "2026-11-01", balance: "10000.00" });
    const second = await request(app).put(`/api/accounts/${bank}/opening-balance`).set(auth(token)).send({ amount: "12000.00", date: "2026-11-01" });
    expect(second.body.account.balance).toBe("12000.00");
    const list = await request(app).get("/api/accounts").set(auth(token));
    expect(list.body.totals.cash).toBe("12000.00");
  });

  it("TEST-API-22: rejects opening balances on income accounts, negative amounts and future dates; accepts 0 (AC-04-2)", async () => {
    const bank = await accountId("Bangkok Bank Savings");
    const salary = await accountId("Salary");
    const put = (id: string, body: object) => request(app).put(`/api/accounts/${id}/opening-balance`).set(auth(token)).send(body);
    expect((await put(salary, { amount: "100.00", date: "2026-11-01" })).body.error.code).toBe("OPENING_BALANCE_NOT_ALLOWED");
    expect((await put(bank, { amount: "-1.00", date: "2026-11-01" })).body.error.code).toBe("INVALID_AMOUNT");
    expect((await put(bank, { amount: "5.00", date: "2999-01-01" })).body.error.code).toBe("DATE_IN_FUTURE");
    const zero = await put(bank, { amount: "0", date: "2026-11-01" });
    expect(zero.status).toBe(200);
    expect(zero.body.account.balance).toBe("0.00");
  });

  it("TEST-API-23: another user cannot see or change these accounts (AC-03-3, BR-01)", async () => {
    const bank = await accountId("Bangkok Bank Savings");
    const bobList = await request(app).get("/api/accounts").set(auth(bobToken));
    expect(bobList.status).toBe(200);
    expect(bobList.body.accounts.map((a: { id: string }) => a.id)).not.toContain(bank);
    const bobPut = await request(app).put(`/api/accounts/${bank}/opening-balance`).set(auth(bobToken)).send({ amount: "1.00", date: "2026-11-01" });
    expect(bobPut.status).toBe(404);
    const unchanged = await prisma.financialAccount.findUniqueOrThrow({ where: { id: bank } });
    expect(unchanged.openingBalance).toBe(0);
  });
});
