// F-01 Authentication and sessions — TEST-API-01..08 (contract: docs/sprints/sprint-1/F-01-authentication.md)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers, PASSWORD } from "../helpers";

const cleanup: string[] = [];
afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-01 authentication and sessions", () => {
  it("TEST-API-01: valid login returns a session token and the user; /me returns that user (AC-01-1, AC-01-3)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alice@moneylog.test", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.user).toMatchObject({ email: "alice@moneylog.test", fullName: "Alice Wong", role: "USER" });

    const me = await request(app).get("/api/auth/me").set(auth(res.body.token));
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: "alice@moneylog.test", role: "USER" });
  });

  it("TEST-API-02: wrong password and unknown e-mail get the same 401 and no token (AC-01-2)", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: "alice@moneylog.test", password: "nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "ghost@moneylog.test", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrong.body.token).toBeUndefined();
  });

  it("TEST-API-02b: missing fields give 400 VALIDATION_ERROR; e-mail is case-insensitive", async () => {
    const missing = await request(app).post("/api/auth/login").send({ email: "alice@moneylog.test" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
    const upper = await request(app).post("/api/auth/login").send({ email: "ALICE@MoneyLog.test", password: PASSWORD });
    expect(upper.status).toBe(200);
  });

  it("TEST-API-03: /me reports the administrator role for an admin session (AC-01-3)", async () => {
    const token = await login("admin@moneylog.test");
    const me = await request(app).get("/api/auth/me").set(auth(token));
    expect(me.body.user.role).toBe("ADMIN");
  });

  it("TEST-API-04: logout revokes the token (AC-01-4)", async () => {
    const token = await login("alice@moneylog.test");
    const out = await request(app).post("/api/auth/logout").set(auth(token));
    expect(out.status).toBe(204);
    const me = await request(app).get("/api/auth/me").set(auth(token));
    expect(me.status).toBe(401);
  });

  it("TEST-API-05: a disabled user cannot sign in, even with the right password (AC-01-5, BR-03)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "dan@moneylog.test", password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("TEST-API-06: no response exposes a password hash (AC-01-6, NFR-01)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alice@moneylog.test", password: PASSWORD });
    const me = await request(app).get("/api/auth/me").set(auth(res.body.token));
    for (const body of [res.body, me.body]) {
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    }
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "alice@moneylog.test" } });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$1\d\$/); // bcrypt, cost >= 10
  });

  it("TEST-API-07: protected routes answer 401 without data for missing or forged tokens (AC-01-7, NFR-02)", async () => {
    for (const path of ["/api/auth/me", "/api/accounts", "/api/transactions", "/api/summary", "/api/admin/users"]) {
      const none = await request(app).get(path);
      const forged = await request(app).get(path).set(auth("f".repeat(64)));
      for (const r of [none, forged]) {
        expect(r.status, path).toBe(401);
        expect(Object.keys(r.body)).toEqual(["error"]);
      }
    }
  });

  it("TEST-API-08: an expired session is rejected (AC-01-8, NFR-03); only the token hash is stored", async () => {
    const { user, email } = await createTempUser("expiry");
    cleanup.push(user.id);
    const token = await login(email);
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await prisma.session.findUniqueOrThrow({ where: { tokenHash: hash } });
    expect(session.tokenHash).not.toBe(token);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const me = await request(app).get("/api/auth/me").set(auth(token));
    expect(me.status).toBe(401);
  });
});
