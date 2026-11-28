// F-12 Search and filter — TEST-API-100..105 (contract F-12 v1.0)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers } from "../helpers";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { todayInBangkok } from "../../src/domain/dates";

const cleanup: string[] = [];
const TODAY = todayInBangkok();
const YESTERDAY = new Date(Date.parse(`${TODAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

async function newUser(prefix: string) {
  const { user, email } = await createTempUser(prefix);
  cleanup.push(user.id);
  await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
  const accounts = await prisma.financialAccount.findMany({ where: { ownerId: user.id } });
  return { user, token: await login(email), ids: Object.fromEntries(accounts.map((a) => [a.name, a.id])) as Record<string, string> };
}
type U = Awaited<ReturnType<typeof newUser>>;
const post = (t: string, b: object) => request(app).post("/api/transactions").set(auth(t)).send(b);
const search = (t: string, q: Record<string, string>) => request(app).get("/api/transactions").query(q).set(auth(t));
const descs = (res: request.Response) => res.body.transactions.map((t: { description: string }) => t.description).sort();

let alice: U;
let bob: U;
beforeAll(async () => {
  alice = await newUser("flt-a");
  bob = await newUser("flt-b");
  // The Sprint 1 journey, with the salary dated yesterday so date filters can separate it.
  await post(alice.token, { kind: "RECEIPT", date: YESTERDAY, accountId: alice.ids["Bangkok Bank Savings"], total: "30000.00", description: "November salary", lines: [{ accountId: alice.ids["Salary"], amount: "30000.00" }] });
  await post(alice.token, { kind: "PAYMENT", date: TODAY, accountId: alice.ids["KTC Credit Card"], total: "1500.00", description: "Dinner and groceries",
    lines: [{ accountId: alice.ids["Dining"], amount: "900.00" }, { accountId: alice.ids["Groceries"], amount: "600.00" }] });
  await post(alice.token, { kind: "PAYMENT", date: TODAY, accountId: alice.ids["Bangkok Bank Savings"], total: "1500.00", description: "Pay card 100%", lines: [{ accountId: alice.ids["KTC Credit Card"], amount: "1500.00" }] });
  await post(bob.token, { kind: "PAYMENT", date: TODAY, accountId: bob.ids["Bangkok Bank Savings"], total: "10.00", description: "Bob coffee", lines: [{ accountId: bob.ids["Dining"], amount: "10.00" }] });
});
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-12 search and filter", () => {
  it("TEST-API-100: q is case-insensitive and % is a literal character (AC-12-1)", async () => {
    const res = await search(alice.token, { q: "DINNER" });
    expect(res.status).toBe(200);
    expect(descs(res)).toEqual(["Dinner and groceries"]);
    expect(res.body.count).toBe(1);
    expect(descs(await search(alice.token, { q: "100%" }))).toEqual(["Pay card 100%"]);
    expect(descs(await search(alice.token, { q: "%" }))).toEqual(["Pay card 100%"]); // not a wildcard
  });

  it("TEST-API-101: accountId matches a line or the primary account (AC-12-2)", async () => {
    expect(descs(await search(alice.token, { accountId: alice.ids["Groceries"] }))).toEqual(["Dinner and groceries"]);
    expect(descs(await search(alice.token, { accountId: alice.ids["Bangkok Bank Savings"] }))).toEqual(["November salary", "Pay card 100%"]);
    expect(descs(await search(alice.token, { accountId: alice.ids["KTC Credit Card"] }))).toEqual(["Dinner and groceries", "Pay card 100%"]);
  });

  it("TEST-API-102: date and amount boundaries are inclusive (AC-12-3)", async () => {
    expect(descs(await search(alice.token, { from: TODAY, to: TODAY }))).toEqual(["Dinner and groceries", "Pay card 100%"]);
    expect(descs(await search(alice.token, { from: YESTERDAY, to: YESTERDAY }))).toEqual(["November salary"]);
    expect(descs(await search(alice.token, { min: "1500.00", max: "1500.00" }))).toEqual(["Dinner and groceries", "Pay card 100%"]);
    expect(descs(await search(alice.token, { min: "1500.01" }))).toEqual(["November salary"]);
  });

  it("TEST-API-103: invalid parameters give 400 VALIDATION_ERROR with the field (AC-12-4)", async () => {
    const cases: [Record<string, string>, string][] = [
      [{ from: "2026-11-30", to: "2026-11-01" }, "from"],
      [{ min: "2000", max: "1000" }, "min"],
      [{ kind: "TRANSFER" }, "kind"],
      [{ q: "x".repeat(101) }, "q"],
      [{ min: "1.234" }, "min"],
    ];
    for (const [q, field] of cases) {
      const res = await search(alice.token, q);
      expect(res.status, JSON.stringify(q)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(res.body.error.details)).toContain(field);
    }
  });

  it("TEST-API-104: Bob with Alice's account id or text gets 0 rows; the Administrator gets 403 (AC-12-5)", async () => {
    const byId = await search(bob.token, { accountId: alice.ids["Dining"] });
    expect(byId.status).toBe(200);
    expect(byId.body).toEqual({ transactions: [], count: 0 });
    expect((await search(bob.token, { q: "Dinner and groceries" })).body.count).toBe(0);
    expect(descs(await search(bob.token, {}))).toEqual(["Bob coffee"]);
    const admin = await login("admin@moneylog.test");
    expect((await search(admin, { q: "Dinner" })).status).toBe(403);
  });

  it("TEST-API-105: filters combine with AND (AC-12-6)", async () => {
    expect(descs(await search(alice.token, { kind: "PAYMENT", min: "1000" }))).toEqual(["Dinner and groceries", "Pay card 100%"]);
    expect(descs(await search(alice.token, { kind: "RECEIPT", q: "dinner" }))).toEqual([]);
    expect(descs(await search(alice.token, { kind: "PAYMENT", accountId: alice.ids["Bangkok Bank Savings"], from: TODAY }))).toEqual(["Pay card 100%"]);
  });
});
