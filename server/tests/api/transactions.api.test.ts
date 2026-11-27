// F-05/F-06 record transactions — TEST-API-30..35, 40..42
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok } from "../../src/domain/dates";

const cleanup: string[] = [];
let token = "";
let userId = "";
let ids: Record<string, string> = {};
let bobDiningId = "";
const TODAY = todayInBangkok();

async function newUserWithAccounts(prefix: string) {
  const { user, email } = await createTempUser(prefix);
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  const accounts = await prisma.financialAccount.findMany({ where: { ownerId: user.id } });
  return { user, token: await login(email), ids: Object.fromEntries(accounts.map((a) => [a.name, a.id])) };
}

beforeAll(async () => {
  const u = await newUserWithAccounts("txn");
  token = u.token; userId = u.user.id; ids = u.ids;
  bobDiningId = (await prisma.financialAccount.findFirstOrThrow({ where: { owner: { email: "bob@moneylog.test" }, name: "Dining" } })).id;
});
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

const post = (body: object, t = token) => request(app).post("/api/transactions").set(auth(t)).send(body);
const balances = async (t = token) => {
  const res = await request(app).get("/api/accounts").set(auth(t));
  return Object.fromEntries(res.body.accounts.map((a: { name: string; balance: string }) => [a.name, a.balance]));
};
const count = () => prisma.transaction.count({ where: { ownerId: userId } });

describe("F-05/F-06 recording transactions", () => {
  it("TEST-API-30: the theme's Sprint 1 journey gives the right balances (AC-05-1)", async () => {
    await request(app).put(`/api/accounts/${ids["Bangkok Bank Savings"]}/opening-balance`).set(auth(token)).send({ amount: "10000.00", date: "2026-11-01" });

    const salary = await post({ kind: "RECEIPT", date: "2026-11-05", description: "November salary", accountId: ids["Bangkok Bank Savings"], total: "30000.00",
      lines: [{ accountId: ids["Salary"], amount: "30000.00" }] });
    expect(salary.status).toBe(201);

    const purchase = await post({ kind: "PAYMENT", date: "2026-11-08", description: "Dinner and groceries", accountId: ids["KTC Credit Card"], total: "1500.00",
      lines: [{ accountId: ids["Dining"], amount: "900.00" }, { accountId: ids["Groceries"], amount: "600.00" }] });
    expect(purchase.status).toBe(201);
    expect(purchase.body.transaction).toMatchObject({
      kind: "PAYMENT", date: "2026-11-08", total: "1500.00",
      account: { name: "KTC Credit Card", type: "LOAN_TAKEN" },
      lines: [{ account: { name: "Dining", type: "EXPENSE" }, amount: "900.00" }, { account: { name: "Groceries" }, amount: "600.00" }],
    });
    expect((await balances())["KTC Credit Card"]).toBe("1500.00");

    const repay = await post({ kind: "PAYMENT", date: "2026-11-10", description: "Card repayment", accountId: ids["Bangkok Bank Savings"], total: "1500.00",
      lines: [{ accountId: ids["KTC Credit Card"], amount: "1500.00" }] });
    expect(repay.status).toBe(201);

    const b = await balances();
    expect(b).toMatchObject({ "Bangkok Bank Savings": "38500.00", "KTC Credit Card": "0.00", Dining: "900.00", Groceries: "600.00", Salary: "30000.00" });
    // persisted: the stored rows are integer satang
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: purchase.body.transaction.id }, include: { lines: true } });
    expect(stored.totalAmount).toBe(150000);
    expect(stored.lines.map((l) => l.amount).sort()).toEqual([60000, 90000]);
  });

  it("TEST-API-31: lines that do not add up are rejected and nothing is stored (AC-05-2, NFR-05)", async () => {
    const before = await count();
    const res = await post({ kind: "PAYMENT", date: TODAY, accountId: ids["KTC Credit Card"], total: "1500.00",
      lines: [{ accountId: ids["Dining"], amount: "900.00" }, { accountId: ids["Groceries"], amount: "500.00" }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("LINES_TOTAL_MISMATCH");
    expect(await count()).toBe(before);
  });

  it("TEST-API-32: invalid amounts are rejected (AC-05-3)", async () => {
    for (const total of ["0", "1.234"]) {
      const res = await post({ kind: "PAYMENT", date: TODAY, accountId: ids["Wallet"], total, lines: [{ accountId: ids["Dining"], amount: total }] });
      expect(res.status, total).toBe(400);
      expect(res.body.error.code).toBe("INVALID_AMOUNT");
    }
  });

  it("TEST-API-33: a payment cannot use an income account (AC-05-4, BR-08)", async () => {
    const res = await post({ kind: "PAYMENT", date: TODAY, accountId: ids["Wallet"], total: "50.00", lines: [{ accountId: ids["Salary"], amount: "50.00" }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
  });

  it("TEST-API-34: another user's account cannot be used and nothing is stored (AC-05-5, BR-10)", async () => {
    const before = await count();
    const res = await post({ kind: "PAYMENT", date: TODAY, accountId: ids["Wallet"], total: "50.00", lines: [{ accountId: bobDiningId, amount: "50.00" }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    expect(await count()).toBe(before);
    const bobLines = await prisma.allocationLine.count({ where: { accountId: bobDiningId } });
    expect(bobLines).toBe(0);
  });

  it("TEST-API-35: tomorrow is rejected, today is accepted (AC-05-6, BR-14)", async () => {
    const tomorrow = new Date(Date.parse(`${TODAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    // v1.1 (CR-01): paid from the bank — the empty wallet relied on the BR-15 v1 overdraft; the date assertion is unchanged.
    const body = (date: string) => ({ kind: "PAYMENT", date, accountId: ids["Bangkok Bank Savings"], total: "10.00", lines: [{ accountId: ids["Telecom"], amount: "10.00" }] });
    const future = await post(body(tomorrow));
    expect(future.status).toBe(400);
    expect(future.body.error.code).toBe("DATE_IN_FUTURE");
    expect((await post(body(TODAY))).status).toBe(201);
  });

  it("TEST-API-36 (#47 regression): a future-dated payment stores nothing and changes no balance (AC-05-6, BR-14)", async () => {
    // Found by the independent UAT team on be84770 (UAT-02 step 4): tomorrow was accepted and saved.
    const u = await newUserWithAccounts("future47");
    const tomorrow = new Date(Date.parse(`${TODAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const before = await balances(u.token);
    const res = await post({ kind: "PAYMENT", date: tomorrow, description: "UAT-02 future date probe", accountId: u.ids["Wallet"], total: "1.00",
      lines: [{ accountId: u.ids["Dining"], amount: "1.00" }] }, u.token);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("DATE_IN_FUTURE");
    expect(await prisma.transaction.count({ where: { ownerId: u.user.id } })).toBe(0);
    expect(await balances(u.token)).toEqual(before);
  });

  it("TEST-API-40: salary received raises the bank balance and the income account (AC-06-1)", async () => {
    const u = await newUserWithAccounts("salary");
    const res = await post({ kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "30000.00",
      lines: [{ accountId: u.ids["Salary"], amount: "30000.00" }] }, u.token);
    expect(res.status).toBe(201);
    expect(await balances(u.token)).toMatchObject({ "Bangkok Bank Savings": "30000.00", Salary: "30000.00" });
  });

  it("TEST-API-41: a receipt cannot use an expense line or a non-cash receiving account (AC-06-2, BR-09)", async () => {
    const withExpense = await post({ kind: "RECEIPT", date: TODAY, accountId: ids["Wallet"], total: "20.00", lines: [{ accountId: ids["Dining"], amount: "20.00" }] });
    const intoCard = await post({ kind: "RECEIPT", date: TODAY, accountId: ids["KTC Credit Card"], total: "20.00", lines: [{ accountId: ids["Salary"], amount: "20.00" }] });
    for (const r of [withExpense, intoCard]) {
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
    }
  });

  it("TEST-API-42: borrowing and a transfer received move balances without creating income (AC-06-3)", async () => {
    const u = await newUserWithAccounts("borrow");
    await request(app).put(`/api/accounts/${u.ids["Bangkok Bank Savings"]}/opening-balance`).set(auth(u.token)).send({ amount: "5000.00", date: "2026-11-01" });
    const res = await post({ kind: "RECEIPT", date: TODAY, description: "Borrowed from Mom + ATM", accountId: u.ids["Wallet"], total: "3000.00",
      lines: [{ accountId: u.ids["Loan from Mom"], amount: "2000.00" }, { accountId: u.ids["Bangkok Bank Savings"], amount: "1000.00" }] }, u.token);
    expect(res.status).toBe(201);
    expect(await balances(u.token)).toMatchObject({ Wallet: "3000.00", "Loan from Mom": "2000.00", "Bangkok Bank Savings": "4000.00", Salary: "0.00", "Interest Earned": "0.00" });
  });
});
