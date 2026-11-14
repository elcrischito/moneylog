import request from "supertest";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { app } from "../src/app";

export const prisma = new PrismaClient();
export const PASSWORD = "Password123!"; // local seed fallback (see prisma/seed.ts)

export async function login(email: string, password = PASSWORD): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// A throw-away user with its own starter accounts, so tests do not depend on each other.
export async function createTempUser(prefix: string, role: Role = Role.USER) {
  const email = `${prefix}.${Date.now()}.${Math.round(Math.random() * 1e6)}@moneylog.test`;
  const user = await prisma.user.create({
    data: { email, fullName: `Temp ${prefix}`, passwordHash: await bcrypt.hash(PASSWORD, 4), role },
  });
  return { user, email };
}

export async function deleteUsers(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.allocationLine.deleteMany({ where: { transaction: { ownerId: { in: ids } } } });
  await prisma.transaction.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
