// F-11 Transaction correction — TEST-API-90..96 (contract F-11 v1.1)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok } from "../../src/domain/dates";

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
const put = (t: string, id: string, b: object) => request(app).put(`/api/transactions/${id}`).set(auth(t)).send(b);
const del = (t: string, id: string) => request(app).delete(`/api/transactions/${id}`).set(auth(t));
const balances = async (t: string): Promise<Record<string, string>> =>
  Object.fromEntries((await request(app).get("/api/accounts").set(auth(t))).body.accounts.map((a: { name: string; balance: string }) => [a.name, a.balance]));
const summary = async (t: string) => (await request(app).get("/api/summary").query(MONTH).set(auth(t))).body;
const stored = (id: string) => prisma.transaction.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });

type U = Awaited<ReturnType<typeof newUser>>;
const purchase = (u: U, total = "1500.00", dining = "900.00", groceries = "600.00", description = "Dinner and groceries") => ({
  kind: "PAYMENT", date: TODAY, accountId: u.ids["KTC Credit Card"], total, description,
  lines: [{ accountId: u.ids["Dining"], amount: dining }, { accountId: u.ids["Groceries"], amount: groceries }],
});

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-11 transaction correction", () => {
  it("TEST-API-90: edit 1500 → 1200 (700 + 500): balances, expense −300, same id and createdAt (AC-11-1)", async () => {
    const u = await newUser("edit90");
    const created = (await post(u.token, purchase(u))).body.transaction;
    const before = await summary(u.token);
    const res = await put(u.token, created.id, purchase(u, "1200.00", "700.00", "500.00"));
    expect(res.status).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: created.id, total: "1200.00", createdAt: created.createdAt });
    expect(await balances(u.token)).toMatchObject({ "KTC Credit Card": "1200.00", Dining: "700.00", Groceries: "500.00" });
    expect(Number(before.expense.total) - Number((await summary(u.token)).expense.total)).toBe(300);
    const row = await stored(created.id);
    expect(row!.lines.map((l) => l.amount)).toEqual([70000, 50000]);
  });

  it("TEST-API-91: invalid edits are refused and the stored transaction is unchanged (AC-11-2)", async () => {
    const alice = await newUser("edit91a");
    const bob = await newUser("edit91b");
    const created = (await post(alice.token, purchase(alice))).body.transaction;
    const snapshot = JSON.stringify(await stored(created.id));
    const tomorrow = new Date(Date.parse(`${TODAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const cases: [object, string][] = [
      [purchase(alice, "1500.00", "900.00", "500.00"), "LINES_TOTAL_MISMATCH"],
      [{ ...purchase(alice), date: tomorrow }, "DATE_IN_FUTURE"],
      [{ ...purchase(alice), lines: [{ accountId: bob.ids["Dining"], amount: "1500.00" }] }, "ACCOUNT_NOT_FOUND"],
    ];
    for (const [body, code] of cases) {
      const res = await put(alice.token, created.id, body);
      expect(res.status, code).toBe(400);
      expect(res.body.error.code).toBe(code);
    }
    expect(JSON.stringify(await stored(created.id))).toBe(snapshot);
  });

  it("TEST-API-92: deleting the 30,000 salary removes it, its lines, the bank balance and the income (AC-11-3)", async () => {
    const u = await newUser("edit92");
    const salary = (await post(u.token, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "30000.00", description: "Salary", lines: [{ accountId: u.ids["Salary"], amount: "30000.00" }] })).body.transaction;
    const before = await summary(u.token);
    expect((await balances(u.token))["Bangkok Bank Savings"]).toBe("30000.00");
    const res = await del(u.token, salary.id);
    expect(res.status).toBe(204);
    expect((await balances(u.token))["Bangkok Bank Savings"]).toBe("0.00");
    expect(Number(before.income.total) - Number((await summary(u.token)).income.total)).toBe(30000);
    expect(await prisma.allocationLine.count({ where: { transactionId: salary.id } })).toBe(0);
    expect((await request(app).get("/api/transactions").set(auth(u.token))).body.transactions.map((t: { id: string }) => t.id)).not.toContain(salary.id);
    expect((await del(u.token, salary.id)).status).toBe(404);
  });

  it("TEST-API-93: Bob's PUT/DELETE on Alice's transaction → 404 and unchanged; Administrator → 403 (AC-11-4)", async () => {
    const alice = await newUser("edit93a");
    const bob = await newUser("edit93b");
    const created = (await post(alice.token, purchase(alice))).body.transaction;
    const snapshot = JSON.stringify(await stored(created.id));
    expect((await put(bob.token, created.id, purchase(bob, "1.00", "0.50", "0.50"))).status).toBe(404);
    expect((await del(bob.token, created.id)).status).toBe(404);
    expect(JSON.stringify(await stored(created.id))).toBe(snapshot);
    const admin = await login("admin@moneylog.test");
    expect((await put(admin, created.id, purchase(alice))).status).toBe(403);
    expect((await del(admin, created.id)).status).toBe(403);
    expect(JSON.stringify(await stored(created.id))).toBe(snapshot);
  });

  it("TEST-API-94: an old transaction on a now-inactive account can be edited; a new inactive account cannot (AC-11-5)", async () => {
    const u = await newUser("edit94");
    const created = (await post(u.token, purchase(u))).body.transaction;
    await prisma.financialAccount.updateMany({ where: { id: { in: [u.ids["Dining"], u.ids["Telecom"]] } }, data: { isActive: false } });
    const ok = await put(u.token, created.id, purchase(u, "1500.00", "900.00", "600.00", "Dinner and groceries (corrected)"));
    expect(ok.status).toBe(200);
    expect(ok.body.transaction.description).toBe("Dinner and groceries (corrected)");
    const res = await put(u.token, created.id, { ...purchase(u), total: "1600.00", lines: [...purchase(u).lines, { accountId: u.ids["Telecom"], amount: "100.00" }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("TEST-API-95: PAYMENT → RECEIPT with valid receipt accounts; balances follow the new kind (AC-11-6)", async () => {
    const u = await newUser("edit95");
    const created = (await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "200.00", description: "wrong kind", lines: [{ accountId: u.ids["Dining"], amount: "200.00" }] })).body.transaction;
    expect((await balances(u.token))["Bangkok Bank Savings"]).toBe("-200.00");
    const res = await put(u.token, created.id, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "200.00", description: "refund", lines: [{ accountId: u.ids["Salary"], amount: "200.00" }] });
    expect(res.status).toBe(200);
    expect(res.body.transaction.kind).toBe("RECEIPT");
    expect(await balances(u.token)).toMatchObject({ "Bangkok Bank Savings": "200.00", Dining: "0.00", Salary: "200.00" });
  });

  it("TEST-API-96: the wallet rule applies to edits, without the original's own effect (AC-11-7, CR-01)", async () => {
    const u = await newUser("edit96");
    await request(app).put(`/api/accounts/${u.ids["Wallet"]}/opening-balance`).set(auth(u.token)).send({ amount: "100.00", date: "2026-11-01" });
    const body = (amount: string, description: string) => ({ kind: "PAYMENT", date: TODAY, accountId: u.ids["Wallet"], total: amount, description, lines: [{ accountId: u.ids["Dining"], amount }] });
    const created = (await post(u.token, body("100.00", "street food"))).body.transaction;
    expect((await balances(u.token)).Wallet).toBe("0.00");
    expect((await put(u.token, created.id, body("100.00", "street food (corrected)"))).status).toBe(200);
    const snapshot = JSON.stringify(await stored(created.id));
    const over = await put(u.token, created.id, body("100.01", "too much"));
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe("INSUFFICIENT_WALLET_FUNDS");
    expect(JSON.stringify(await stored(created.id))).toBe(snapshot);
  });
});
