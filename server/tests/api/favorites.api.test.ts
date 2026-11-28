// F-14 Favorites — TEST-API-120..124 (contract F-14 v1.0)
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
type U = Awaited<ReturnType<typeof newUser>>;
const post = (t: string, b: object) => request(app).post("/api/transactions").set(auth(t)).send(b);
const fav = (t: string, id: string, isFavorite: unknown) => request(app).put(`/api/transactions/${id}/favorite`).set(auth(t)).send({ isFavorite });
const list = (t: string, q: Record<string, string>) => request(app).get("/api/transactions").query(q).set(auth(t));
const ids = (res: request.Response) => res.body.transactions.map((t: { id: string }) => t.id);
const purchase = (u: U) => ({ kind: "PAYMENT", date: TODAY, accountId: u.ids["KTC Credit Card"], total: "1500.00", description: "Dinner and groceries",
  lines: [{ accountId: u.ids["Dining"], amount: "900.00" }, { accountId: u.ids["Groceries"], amount: "600.00" }] });
const balances = async (t: string) => (await request(app).get("/api/accounts").set(auth(t))).body.accounts;
const summary = async (t: string) => (await request(app).get("/api/summary").query(MONTH).set(auth(t))).body;
const stored = (id: string) => prisma.transaction.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-14 favorites", () => {
  it("TEST-API-120: mark, list, unmark (AC-14-1)", async () => {
    const u = await newUser("fav120");
    const tx = (await post(u.token, purchase(u))).body.transaction;
    expect(tx.isFavorite).toBe(false);
    const on = await fav(u.token, tx.id, true);
    expect(on.status).toBe(200);
    expect(on.body.transaction).toMatchObject({ id: tx.id, isFavorite: true });
    expect(ids(await list(u.token, { favorite: "true" }))).toEqual([tx.id]);
    expect((await fav(u.token, tx.id, true)).status).toBe(200); // idempotent
    expect((await fav(u.token, tx.id, false)).body.transaction.isFavorite).toBe(false);
    expect(ids(await list(u.token, { favorite: "true" }))).toEqual([]);
  });

  it("TEST-API-121: marking changes nothing else (AC-14-2)", async () => {
    const u = await newUser("fav121");
    const tx = (await post(u.token, purchase(u))).body.transaction;
    const before = { row: await stored(tx.id), balances: await balances(u.token), summary: await summary(u.token) };
    await fav(u.token, tx.id, true);
    const after = { row: await stored(tx.id), balances: await balances(u.token), summary: await summary(u.token) };
    expect(after.row!.isFavorite).toBe(true);
    expect({ ...after.row, isFavorite: false, updatedAt: null }).toEqual({ ...before.row, updatedAt: null });
    expect(after.balances).toEqual(before.balances);
    expect(after.summary).toEqual(before.summary);
  });

  it("TEST-API-122: favorite combines with F-12 filters; favorite=yes → 400 (AC-14-3)", async () => {
    const u = await newUser("fav122");
    const card = (await post(u.token, purchase(u))).body.transaction;
    const salary = (await post(u.token, { kind: "RECEIPT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "30000.00", lines: [{ accountId: u.ids["Salary"], amount: "30000.00" }] })).body.transaction;
    await post(u.token, { kind: "PAYMENT", date: TODAY, accountId: u.ids["Bangkok Bank Savings"], total: "2000.00", lines: [{ accountId: u.ids["Electricity"], amount: "2000.00" }] });
    await fav(u.token, card.id, true);
    await fav(u.token, salary.id, true);
    expect(ids(await list(u.token, { favorite: "true", kind: "PAYMENT", min: "1000" }))).toEqual([card.id]);
    expect((await list(u.token, { favorite: "false" })).body.count).toBe(1);
    const bad = await list(u.token, { favorite: "yes" });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body.error.details)).toContain("favorite");
  });

  it("TEST-API-123: owner only; the Administrator gets 403 (AC-14-4)", async () => {
    const alice = await newUser("fav123a");
    const bob = await newUser("fav123b");
    const tx = (await post(alice.token, purchase(alice))).body.transaction;
    await fav(alice.token, tx.id, true);
    expect((await fav(bob.token, tx.id, false)).status).toBe(404);
    expect((await stored(tx.id))!.isFavorite).toBe(true);
    expect((await list(bob.token, { favorite: "true" })).body.count).toBe(0);
    const admin = await login("admin@moneylog.test");
    expect((await fav(admin, tx.id, false)).status).toBe(403);
    expect((await stored(tx.id))!.isFavorite).toBe(true);
  });

  it("TEST-API-124: an F-11 edit keeps the mark; a string body is refused (AC-14-5)", async () => {
    const u = await newUser("fav124");
    const tx = (await post(u.token, purchase(u))).body.transaction;
    await fav(u.token, tx.id, true);
    const edited = await request(app).put(`/api/transactions/${tx.id}`).set(auth(u.token)).send({ ...purchase(u), description: "edited" });
    expect(edited.status).toBe(200);
    expect(edited.body.transaction).toMatchObject({ description: "edited", isFavorite: true });
    for (const v of ["true", 1, null]) {
      const res = await fav(u.token, tx.id, v);
      expect(res.status, String(v)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
