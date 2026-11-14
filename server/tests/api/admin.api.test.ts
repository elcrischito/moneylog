// F-02 Administrator user access — TEST-API-10..14 (contract: docs/sprints/sprint-1/F-02-admin-user-access.md)
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers, PASSWORD } from "../helpers";

const cleanup: string[] = [];
let adminToken = "";
let aliceToken = "";

beforeAll(async () => {
  adminToken = await login("admin@moneylog.test");
  aliceToken = await login("alice@moneylog.test");
});
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-02 administrator user access", () => {
  it("TEST-API-10: the admin lists users without password hashes or financial data (AC-02-1)", async () => {
    const res = await request(app).get("/api/admin/users").set(auth(adminToken));
    expect(res.status).toBe(200);
    const emails = res.body.users.map((u: { email: string }) => u.email);
    expect(emails).toEqual(expect.arrayContaining(["alice@moneylog.test", "bob@moneylog.test", "dan@moneylog.test"]));
    const dan = res.body.users.find((u: { email: string }) => u.email === "dan@moneylog.test");
    expect(dan).toMatchObject({ role: "USER", isActive: false });
    expect(Object.keys(dan).sort()).toEqual(["createdAt", "email", "fullName", "id", "isActive", "role"]);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|balance|accounts|transactions/);
  });

  it("TEST-API-11: disabling a user blocks sign-in and enabling restores it (AC-02-2)", async () => {
    const { user, email } = await createTempUser("toggle");
    cleanup.push(user.id);
    const off = await request(app).patch(`/api/admin/users/${user.id}`).set(auth(adminToken)).send({ isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.user.isActive).toBe(false);
    expect((await request(app).post("/api/auth/login").send({ email, password: PASSWORD })).status).toBe(401);

    const on = await request(app).patch(`/api/admin/users/${user.id}`).set(auth(adminToken)).send({ isActive: true });
    expect(on.body.user.isActive).toBe(true);
    expect((await request(app).post("/api/auth/login").send({ email, password: PASSWORD })).status).toBe(200);
  });

  it("TEST-API-12: disabling a signed-in user revokes their session at once (AC-02-3, BR-03)", async () => {
    const { user, email } = await createTempUser("revoke");
    cleanup.push(user.id);
    const token = await login(email);
    expect((await request(app).get("/api/auth/me").set(auth(token))).status).toBe(200);
    await request(app).patch(`/api/admin/users/${user.id}`).set(auth(adminToken)).send({ isActive: false });
    expect((await request(app).get("/api/auth/me").set(auth(token))).status).toBe(401);
  });

  it("TEST-API-13: the admin gets 403 on every financial route and a user gets 403 on admin routes (AC-02-4, BR-02)", async () => {
    const someAccount = await prisma.financialAccount.findFirstOrThrow({ where: { owner: { email: "alice@moneylog.test" } } });
    const calls = [
      request(app).get("/api/accounts"),
      request(app).put(`/api/accounts/${someAccount.id}/opening-balance`).send({ amount: "1.00", date: "2026-11-01" }),
      request(app).get("/api/transactions"),
      request(app).post("/api/transactions").send({}),
      request(app).get("/api/transactions/00000000-0000-0000-0000-000000000000"),
      request(app).get("/api/summary"),
    ];
    for (const call of calls) {
      const res = await call.set(auth(adminToken));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(Object.keys(res.body)).toEqual(["error"]);
    }
    const asUser = await request(app).get("/api/admin/users").set(auth(aliceToken));
    expect(asUser.status).toBe(403);
    const patchAsUser = await request(app).patch(`/api/admin/users/${someAccount.ownerId}`).set(auth(aliceToken)).send({ isActive: false });
    expect(patchAsUser.status).toBe(403);
  });

  it("TEST-API-14: the admin cannot disable their own account (AC-02-5, BR-04); bad input and unknown ids are rejected", async () => {
    const me = await request(app).get("/api/auth/me").set(auth(adminToken));
    const self = await request(app).patch(`/api/admin/users/${me.body.user.id}`).set(auth(adminToken)).send({ isActive: false });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("CANNOT_DISABLE_ADMIN");
    const stillActive = await prisma.user.findUniqueOrThrow({ where: { id: me.body.user.id } });
    expect(stillActive.isActive).toBe(true);

    const bad = await request(app).patch(`/api/admin/users/${me.body.user.id}`).set(auth(adminToken)).send({ isActive: "no" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");

    const unknown = await request(app)
      .patch("/api/admin/users/00000000-0000-0000-0000-000000000000")
      .set(auth(adminToken))
      .send({ isActive: false });
    expect(unknown.status).toBe(404);
  });
});
