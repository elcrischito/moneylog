// F-17 User administration and own password — TEST-API-150..154 (contract F-17 v1.0)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma, login, auth, createTempUser, deleteUsers, PASSWORD } from "../helpers";

const cleanup: string[] = [];
const uniq = () => `${Date.now()}${Math.round(Math.random() * 1e6)}`;
const create = (t: string, b: object) => request(app).post("/api/admin/users").set(auth(t)).send(b);
const reset = (t: string, id: string, password: unknown) => request(app).post(`/api/admin/users/${id}/password`).set(auth(t)).send({ password });
const change = (t: string, b: object) => request(app).post("/api/auth/password").set(auth(t)).send(b);
const me = (t: string) => request(app).get("/api/auth/me").set(auth(t));
const tryLogin = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });

afterAll(async () => {
  await deleteUsers(cleanup);
  await prisma.$disconnect();
});

describe("F-17 user administration and own password", () => {
  it("TEST-API-150: the admin creates a user with 11 starter accounts; the user signs in (AC-17-1)", async () => {
    const admin = await login("admin@moneylog.test");
    const email = `chai.${uniq()}@moneylog.test`;
    const res = await create(admin, { email: email.toUpperCase(), fullName: "Chai Test", password: "chaipass2026" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, fullName: "Chai Test", role: "USER", isActive: true });
    cleanup.push(res.body.user.id);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    const token = await login(email, "chaipass2026");
    const accounts = (await request(app).get("/api/accounts").set(auth(token))).body.accounts;
    expect(accounts).toHaveLength(11);
    expect(accounts.every((a: { balance: string }) => a.balance === "0.00")).toBe(true);
    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$1\d\$/); // bcrypt, cost >= 10 (NFR-01)
  });

  it("TEST-API-151: invalid bodies and a duplicate e-mail are refused; nothing is created (AC-17-2)", async () => {
    const admin = await login("admin@moneylog.test");
    const before = await prisma.user.count();
    const cases: [object, number, string][] = [
      [{ email: `x${uniq()}@m.test`, fullName: "X", password: "abcdefgh1" }, 400, "WEAK_PASSWORD"],
      [{ email: `x${uniq()}@m.test`, fullName: "X", password: "abcdefghijk" }, 400, "WEAK_PASSWORD"],
      [{ email: `x${uniq()}@m.test`, fullName: "X", password: "a".repeat(72) + "1" }, 400, "WEAK_PASSWORD"],
      [{ email: "nope", fullName: "X", password: "chaipass2026" }, 400, "VALIDATION_ERROR"],
      [{ email: "ALICE@moneylog.test", fullName: "Alice 2", password: "chaipass2026" }, 409, "EMAIL_TAKEN"],
    ];
    for (const [body, status, code] of cases) {
      const res = await create(admin, body);
      expect(res.status, code).toBe(status);
      expect(res.body.error.code).toBe(code);
    }
    expect(await prisma.user.count()).toBe(before);
  });

  it("TEST-API-152: a reset revokes the user's sessions; old password fails, new works (AC-17-3)", async () => {
    const admin = await login("admin@moneylog.test");
    const { user, email } = await createTempUser("reset152");
    cleanup.push(user.id);
    const old = await login(email);
    expect((await reset(admin, user.id, "brandnew2026")).status).toBe(204);
    expect((await me(old)).status).toBe(401);
    expect((await tryLogin(email, PASSWORD)).status).toBe(401);
    expect((await tryLogin(email, "brandnew2026")).status).toBe(200);
    expect((await reset(admin, user.id, "weak")).body.error.code).toBe("WEAK_PASSWORD");
    expect((await reset(admin, "00000000-0000-4000-8000-000000000000", "brandnew2026")).status).toBe(404);
  });

  it("TEST-API-153: change own password: wrong current refused; right one keeps this session and revokes the others (AC-17-4)", async () => {
    const { user, email } = await createTempUser("own153");
    cleanup.push(user.id);
    const current = await login(email);
    const other = await login(email);
    const wrong = await change(current, { currentPassword: "nottheone1", newPassword: "newpass2026" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    expect((await tryLogin(email, PASSWORD)).status).toBe(200);
    expect((await change(current, { currentPassword: PASSWORD, newPassword: PASSWORD })).body.error.code).toBe("SAME_PASSWORD");
    expect((await change(current, { currentPassword: PASSWORD, newPassword: "short" })).body.error.code).toBe("WEAK_PASSWORD");
    expect((await change(current, { currentPassword: PASSWORD, newPassword: "newpass2026" })).status).toBe(204);
    expect((await me(current)).status).toBe(200);
    expect((await me(other)).status).toBe(401);
    expect((await tryLogin(email, "newpass2026")).status).toBe(200);
    expect((await tryLogin(email, PASSWORD)).status).toBe(401);
  });

  it("TEST-API-154: users get 403 on admin routes; an admin cannot reset another admin; no passwordHash anywhere (AC-17-5, AC-17-6)", async () => {
    const alice = await login("alice@moneylog.test");
    const { user: bob } = await createTempUser("tgt154");
    cleanup.push(bob.id);
    expect((await create(alice, { email: `y${uniq()}@m.test`, fullName: "Y", password: "chaipass2026" })).status).toBe(403);
    expect((await reset(alice, bob.id, "brandnew2026")).status).toBe(403);
    const admin = await login("admin@moneylog.test");
    const { user: admin2 } = await createTempUser("adm154", "ADMIN" as never);
    cleanup.push(admin2.id);
    expect((await reset(admin, admin2.id, "brandnew2026")).status).toBe(403);
    const list = await request(app).get("/api/admin/users").set(auth(admin));
    expect(JSON.stringify(list.body)).not.toContain("passwordHash");
    expect(JSON.stringify((await me(alice)).body)).not.toContain("passwordHash");
  });
});
