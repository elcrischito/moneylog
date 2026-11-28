// F-15 Duplicate — TEST-API-130 (contract F-15 v1.0, AC-15-1, AC-15-2)
// The duplicate flow reuses GET /api/transactions/:id + POST /api/transactions; this test
// pins that the round trip creates a new row and never touches the original (BR-17).
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok } from "../../src/domain/dates";

const cleanup: string[] = [];
const TODAY = todayInBangkok();
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-15 duplicate", () => {
  it("TEST-API-130: GET original → POST the copy: new id, original byte-identical, balances move again", async () => {
    const { user, email } = await createTempUser("dup130");
    cleanup.push(user.id);
    await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
    const ids = Object.fromEntries((await prisma.financialAccount.findMany({ where: { ownerId: user.id } })).map((a) => [a.name, a.id]));
    const token = await login(email);
    const original = (await request(app).post("/api/transactions").set(auth(token)).send({ kind: "PAYMENT", date: "2026-11-02", accountId: ids["KTC Credit Card"], total: "1500.00", description: "Dinner and groceries",
      lines: [{ accountId: ids["Dining"], amount: "900.00" }, { accountId: ids["Groceries"], amount: "600.00" }] })).body.transaction;
    await request(app).put(`/api/transactions/${original.id}/favorite`).set(auth(token)).send({ isFavorite: true });
    const snapshot = JSON.stringify(await prisma.transaction.findUnique({ where: { id: original.id }, include: { lines: true } }));

    const fetched = (await request(app).get(`/api/transactions/${original.id}`).set(auth(token))).body.transaction;
    const copy = { kind: fetched.kind, date: TODAY, description: fetched.description, accountId: fetched.account.id, total: fetched.total,
      lines: fetched.lines.map((l: { account: { id: string }; amount: string }) => ({ accountId: l.account.id, amount: l.amount })) };
    const res = await request(app).post("/api/transactions").set(auth(token)).send(copy);
    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({ date: TODAY, total: "1500.00", description: "Dinner and groceries", isFavorite: false });
    expect(res.body.transaction.id).not.toBe(original.id);
    expect(JSON.stringify(await prisma.transaction.findUnique({ where: { id: original.id }, include: { lines: true } }))).toBe(snapshot);
    const balances = Object.fromEntries((await request(app).get("/api/accounts").set(auth(token))).body.accounts.map((a: { name: string; balance: string }) => [a.name, a.balance]));
    expect(balances).toMatchObject({ "KTC Credit Card": "3000.00", Dining: "1800.00", Groceries: "1200.00" });

    const other = await createTempUser("dup130b");
    cleanup.push(other.user.id);
    expect((await request(app).get(`/api/transactions/${original.id}`).set(auth(await login(other.email)))).status).toBe(404); // AC-15-4 source
  });
});
