// F-09 Manage financial accounts — TEST-API-70..78 (contract F-09 v1.0)
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
const create = (token: string, body: object) => request(app).post("/api/accounts").set(auth(token)).send(body);
const patch = (token: string, id: string, body: object) => request(app).patch(`/api/accounts/${id}`).set(auth(token)).send(body);
const pay = (token: string, from: string, to: string, amount: string) =>
  request(app).post("/api/transactions").set(auth(token)).send({ kind: "PAYMENT", date: TODAY, accountId: from, total: amount, lines: [{ accountId: to, amount }] });
const list = async (token: string) => (await request(app).get("/api/accounts").set(auth(token))).body.accounts as { id: string; name: string; balance: string; isActive: boolean }[];
const count = (ownerId: string) => prisma.financialAccount.count({ where: { ownerId } });

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-09 manage accounts", () => {
  it("TEST-API-70: create Kasikorn Savings, listed at 0.00 and usable in a payment (AC-09-1)", async () => {
    const u = await newUser("acc70");
    const res = await create(u.token, { name: "  Kasikorn Savings ", type: "CASH", subtype: "BANK" });
    expect(res.status).toBe(201);
    expect(res.body.account).toMatchObject({ name: "Kasikorn Savings", type: "CASH", subtype: "BANK", balance: "0.00", isActive: true });
    expect((await list(u.token)).find((a) => a.name === "Kasikorn Savings")?.balance).toBe("0.00");
    expect((await pay(u.token, res.body.account.id, u.ids["Dining"], "25.00")).status).toBe(201);
  });

  it("TEST-API-71: invalid bodies are refused and nothing is created (AC-09-2)", async () => {
    const u = await newUser("acc71");
    const before = await count(u.user.id);
    const cases: [object, string][] = [
      [{ name: "x".repeat(61), type: "EXPENSE" }, "VALIDATION_ERROR"],
      [{ name: "   ", type: "EXPENSE" }, "VALIDATION_ERROR"],
      [{ name: "Gold", type: "SAVINGS" }, "VALIDATION_ERROR"],
      [{ name: "Pocket", type: "CASH" }, "INVALID_SUBTYPE"],
      [{ name: "Rent", type: "EXPENSE", subtype: "BANK" }, "INVALID_SUBTYPE"],
    ];
    for (const [body, code] of cases) {
      const res = await create(u.token, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe(code);
    }
    expect(await count(u.user.id)).toBe(before);
  });

  it("TEST-API-72: names are unique per user, case-insensitively (AC-09-3)", async () => {
    const alice = await newUser("acc72a");
    const bob = await newUser("acc72b");
    const dup = await create(alice.token, { name: "groceries ", type: "EXPENSE" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("ACCOUNT_NAME_TAKEN");
    expect((await create(bob.token, { name: "Pet food", type: "EXPENSE" })).status).toBe(201);
    expect((await create(alice.token, { name: "Pet food", type: "EXPENSE" })).status).toBe(201); // same name, other user
  });

  it("TEST-API-73: rename keeps id, balance and transactions; history shows the new name (AC-09-4)", async () => {
    const u = await newUser("acc73");
    await pay(u.token, u.ids["Bangkok Bank Savings"], u.ids["Dining"], "120.00");
    const res = await patch(u.token, u.ids["Dining"], { name: "Eating out" });
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ id: u.ids["Dining"], name: "Eating out", balance: "120.00" });
    const history = await request(app).get("/api/transactions").set(auth(u.token));
    expect(JSON.stringify(history.body.transactions[0].lines)).toContain("Eating out");
    expect((await patch(u.token, u.ids["Dining"], { name: "eating OUT" })).status).toBe(200); // own name, other case: not a conflict
    const clash = await patch(u.token, u.ids["Dining"], { name: "groceries" });
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe("ACCOUNT_NAME_TAKEN");
  });

  it("TEST-API-74: an inactive account is refused in new transactions; reactivating restores it (AC-09-5)", async () => {
    const u = await newUser("acc74");
    await pay(u.token, u.ids["Bangkok Bank Savings"], u.ids["Dining"], "40.00");
    const off = await patch(u.token, u.ids["Dining"], { isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.account).toMatchObject({ isActive: false, balance: "40.00" });
    const refused = await pay(u.token, u.ids["Bangkok Bank Savings"], u.ids["Dining"], "5.00");
    expect(refused.status).toBe(400);
    expect(refused.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    expect((await list(u.token)).find((a) => a.id === u.ids["Dining"])).toMatchObject({ balance: "40.00", isActive: false });
    expect((await patch(u.token, u.ids["Dining"], { isActive: true })).status).toBe(200);
    expect((await pay(u.token, u.ids["Bangkok Bank Savings"], u.ids["Dining"], "5.00")).status).toBe(201);
  });

  it("TEST-API-75: cash/loan accounts need a 0.00 balance to be deactivated; expense accounts do not (AC-09-6)", async () => {
    const u = await newUser("acc75");
    await request(app).put(`/api/accounts/${u.ids["Wallet"]}/opening-balance`).set(auth(u.token)).send({ amount: "0.01", date: "2026-11-01" });
    const refused = await patch(u.token, u.ids["Wallet"], { isActive: false });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("BALANCE_NOT_ZERO");
    await request(app).put(`/api/accounts/${u.ids["Wallet"]}/opening-balance`).set(auth(u.token)).send({ amount: "0", date: "2026-11-01" });
    expect((await patch(u.token, u.ids["Wallet"], { isActive: false })).status).toBe(200);
    await pay(u.token, u.ids["Bangkok Bank Savings"], u.ids["Groceries"], "10.00");
    expect((await patch(u.token, u.ids["Groceries"], { isActive: false })).status).toBe(200);
  });

  it("TEST-API-76: another user gets 404; the Administrator gets 403 (AC-09-7)", async () => {
    const alice = await newUser("acc76a");
    const bob = await newUser("acc76b");
    expect((await patch(bob.token, alice.ids["Dining"], { name: "Mine now" })).status).toBe(404);
    expect((await patch(bob.token, alice.ids["Dining"], { isActive: false })).status).toBe(404);
    expect(JSON.stringify(await list(bob.token))).not.toContain(alice.ids["Dining"]);
    expect((await prisma.financialAccount.findUnique({ where: { id: alice.ids["Dining"] } }))?.name).toBe("Dining");
    const admin = await login("admin@moneylog.test");
    expect((await request(app).get("/api/accounts").set(auth(admin))).status).toBe(403);
    expect((await create(admin, { name: "Admin cash", type: "CASH", subtype: "WALLET" })).status).toBe(403);
    expect((await patch(admin, alice.ids["Dining"], { name: "x" })).status).toBe(403);
  });

  it("TEST-API-77: type and subtype cannot be changed (AC-09-8)", async () => {
    const u = await newUser("acc77");
    for (const body of [{ type: "EXPENSE" }, { subtype: "BANK" }, { name: "Cash box", type: "CASH" }]) {
      const res = await patch(u.token, u.ids["Wallet"], body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("IMMUTABLE_FIELD");
    }
    expect((await prisma.financialAccount.findUnique({ where: { id: u.ids["Wallet"] } }))).toMatchObject({ name: "Wallet", type: "CASH", subtype: "WALLET" });
  });

  it("TEST-API-78: the 100th account is accepted, the 101st refused (boundary)", async () => {
    const u = await newUser("acc78");
    const have = await count(u.user.id);
    await prisma.financialAccount.createMany({
      data: Array.from({ length: 99 - have }, (_, i) => ({ ownerId: u.user.id, name: `Bulk ${i}`, type: "EXPENSE" as const })),
    });
    expect(await count(u.user.id)).toBe(99);
    expect((await create(u.token, { name: "Number 100", type: "EXPENSE" })).status).toBe(201);
    const over = await create(u.token, { name: "Number 101", type: "EXPENSE" });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe("ACCOUNT_LIMIT");
  });
});
