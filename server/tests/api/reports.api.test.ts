// F-16 Reports — TEST-API-140..143 (contract F-16 v1.0)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok, toDbDate } from "../../src/domain/dates";

const cleanup: string[] = [];
const TODAY = todayInBangkok();
const THIS = TODAY.slice(0, 7);
const prevMonth = (() => { const [y, m] = THIS.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; })();

async function newUser(prefix: string) {
  const { user, email } = await createTempUser(prefix);
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  const accounts = await prisma.financialAccount.findMany({ where: { ownerId: user.id } });
  return { user, token: await login(email), ids: Object.fromEntries(accounts.map((a) => [a.name, a.id])) as Record<string, string> };
}
const post = (t: string, b: object) => request(app).post("/api/transactions").set(auth(t)).send(b);
const report = (t: string, q: Record<string, string> = {}) => request(app).get("/api/reports/monthly").query(q).set(auth(t));

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-16 reports", () => {
  it("TEST-API-140: Sprint 1 journey this month: income 30000, expense 1500, net 28500, position 28500 (AC-16-1, AC-16-2)", async () => {
    const u = await newUser("rep140");
    await post(u.token, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "30000.00", lines: [{ accountId: u.ids["Salary"], amount: "30000.00" }] });
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["KTC Credit Card"], total: "1500.00", lines: [{ accountId: u.ids["Dining"], amount: "900.00" }, { accountId: u.ids["Groceries"], amount: "600.00" }] });
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "1500.00", lines: [{ accountId: u.ids["KTC Credit Card"], amount: "1500.00" }] });
    const res = await report(u.token, { months: "2" });
    expect(res.status).toBe(200);
    expect(res.body.months).toHaveLength(2);
    expect(res.body.months[1]).toEqual({ month: THIS, from: `${THIS}-01`, to: TODAY, income: "30000.00", expense: "1500.00", net: "28500.00", netPosition: "28500.00" });
    expect(res.body.months[0]).toMatchObject({ month: prevMonth, income: "0.00", expense: "0.00", netPosition: "0.00" });
    expect((await report(u.token)).body.months).toHaveLength(6); // default
  });

  it("TEST-API-141: an opening balance is counted only from its date (AC-16-3)", async () => {
    const u = await newUser("rep141");
    await request(app).put(`/api/accounts/${u.ids["Bangkok Bank Savings"]}/opening-balance`).set(auth(u.token)).send({ amount: "5000.00", date: `${THIS}-01` });
    await prisma.transaction.create({ data: { ownerId: u.user.id, kind: "PAYMENT", date: toDbDate(`${prevMonth}-15`), description: "", totalAmount: 10000,
      primaryAccountId: u.ids["KTC Credit Card"], lines: { create: [{ accountId: u.ids["Dining"], amount: 10000, position: 0 }] } } });
    const res = await report(u.token, { months: "2" });
    expect(res.body.months[0]).toMatchObject({ month: prevMonth, expense: "100.00", netPosition: "-100.00" });
    expect(res.body.months[1]).toMatchObject({ month: THIS, expense: "0.00", netPosition: "4900.00" });
  });

  it("TEST-API-142: invalid months → 400 field months; months=1 → current month only (AC-16-4)", async () => {
    const u = await newUser("rep142");
    for (const m of ["0", "25", "abc"]) {
      const res = await report(u.token, { months: m });
      expect(res.status, m).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(res.body.error.details)).toContain("months");
    }
    expect((await report(u.token, { months: "1" })).body.months.map((m: { month: string }) => m.month)).toEqual([THIS]);
  });

  it("TEST-API-143: own data only; the Administrator gets 403 (AC-16-5)", async () => {
    const alice = await newUser("rep143a");
    const bob = await newUser("rep143b");
    await post(bob.token, { kind: "RECEIPT", date: TODAY, accountId: bob.ids["Bangkok Bank Savings"], total: "777.00", lines: [{ accountId: bob.ids["Salary"], amount: "777.00" }] });
    expect(JSON.stringify((await report(alice.token, { months: "1" })).body)).not.toContain("777");
    const admin = await login("admin@moneylog.test");
    expect((await report(admin)).status).toBe(403);
  });
});
