// F-13 Category spending — TEST-API-110..113 (contract F-13 v1.0)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok, toDbDate } from "../../src/domain/dates";

const cleanup: string[] = [];
const TODAY = todayInBangkok();
const MONTH = { from: `${TODAY.slice(0, 8)}01`, to: TODAY };

async function newUser(prefix: string) {
  const { user, email } = await createTempUser(prefix);
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  const accounts = await prisma.financialAccount.findMany({ where: { ownerId: user.id } });
  return { user, token: await login(email), ids: Object.fromEntries(accounts.map((a) => [a.name, a.id])) as Record<string, string> };
}
const post = (t: string, b: object) => request(app).post("/api/transactions").set(auth(t)).send(b);
const spending = (t: string, q: Record<string, string>) => request(app).get("/api/spending").query(q).set(auth(t));

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-13 category spending", () => {
  it("TEST-API-110: after the Sprint 1 journey: Dining 900 (60.0), Groceries 600 (40.0), total 1500 (AC-13-1)", async () => {
    const u = await newUser("sp110");
    await post(u.token, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "30000.00", lines: [{ accountId: u.ids["Salary"], amount: "30000.00" }] });
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["KTC Credit Card"], total: "1500.00",
      lines: [{ accountId: u.ids["Dining"], amount: "900.00" }, { accountId: u.ids["Groceries"], amount: "600.00" }] });
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "1500.00", lines: [{ accountId: u.ids["KTC Credit Card"], amount: "1500.00" }] });
    const res = await spending(u.token, MONTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...MONTH, total: "1500.00",
      categories: [
        { accountId: u.ids["Dining"], name: "Dining", amount: "900.00", share: "60.0" },
        { accountId: u.ids["Groceries"], name: "Groceries", amount: "600.00", share: "40.0" },
      ],
    });
    expect((await spending(u.token, {})).body).toMatchObject({ ...MONTH, total: "1500.00" }); // default = this month
  });

  it("TEST-API-111: empty period → 0.00 and no rows; from > to → 400 (AC-13-3)", async () => {
    const u = await newUser("sp111");
    expect((await spending(u.token, { from: "2026-01-01", to: "2026-01-31" })).body).toEqual({ from: "2026-01-01", to: "2026-01-31", total: "0.00", categories: [] });
    const bad = await spending(u.token, { from: "2026-11-30", to: "2026-11-01" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("TEST-API-112: an expense dated 'to' counts, the day after does not (AC-13-4)", async () => {
    const u = await newUser("sp112");
    const row = (date: string, amount: number) => prisma.transaction.create({
      data: { ownerId: u.user.id, kind: "PAYMENT", date: toDbDate(date), description: "", totalAmount: amount, primaryAccountId: u.ids["Bangkok Bank Savings"],
        lines: { create: [{ accountId: u.ids["Dining"], amount, position: 0 }] } },
    });
    await row("2026-10-31", 2500);
    await row("2026-11-01", 999);
    const res = await spending(u.token, { from: "2026-10-01", to: "2026-10-31" });
    expect(res.body.total).toBe("25.00");
    expect(res.body.categories).toEqual([expect.objectContaining({ name: "Dining", amount: "25.00", share: "100.0" })]);
  });

  it("TEST-API-113: Bob's spending is never in Alice's view; the Administrator gets 403 (AC-13-5)", async () => {
    const alice = await newUser("sp113a");
    const bob = await newUser("sp113b");
    await post(bob.token, { kind: "PAYMENT", date: TODAY, accountId: bob.ids["Bangkok Bank Savings"], total: "777.00", lines: [{ accountId: bob.ids["Dining"], amount: "777.00" }] });
    await post(alice.token, { kind: "PAYMENT", date: TODAY, accountId: alice.ids["Bangkok Bank Savings"], total: "10.00", lines: [{ accountId: alice.ids["Dining"], amount: "10.00" }] });
    const res = await spending(alice.token, MONTH);
    expect(res.body.total).toBe("10.00");
    expect(JSON.stringify(res.body)).not.toContain("777");
    const admin = await login("admin@moneylog.test");
    expect((await spending(admin, MONTH)).status).toBe(403);
  });
});
