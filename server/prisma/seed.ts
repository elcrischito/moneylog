// Idempotent seed (System SDS §2). Safe to rerun: it only creates what is missing.
// Passwords come from SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD. Outside production a
// documented local fallback is used so that tests and local runs work out of the box.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { STARTER_ACCOUNTS } from "./starter-accounts";

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === "production";
const LOCAL_FALLBACK_PASSWORD = "Password123!";

function passwordFromEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) throw new Error(`${name} must be set when NODE_ENV=production`);
  return LOCAL_FALLBACK_PASSWORD;
}

export const SEED_USERS = [
  { email: "admin@moneylog.test", fullName: "Nok Administrator", role: Role.ADMIN, isActive: true },
  { email: "alice@moneylog.test", fullName: "Alice Wong", role: Role.USER, isActive: true },
  { email: "bob@moneylog.test", fullName: "Bob Chen", role: Role.USER, isActive: true },
  { email: "dan@moneylog.test", fullName: "Dan Disabled", role: Role.USER, isActive: false },
];


async function main() {
  const adminHash = await bcrypt.hash(passwordFromEnv("SEED_ADMIN_PASSWORD"), 10);
  const userHash = await bcrypt.hash(passwordFromEnv("SEED_USER_PASSWORD"), 10);

  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: u.role === Role.ADMIN ? adminHash : userHash },
    });
    if (u.role === Role.USER) {
      for (const a of STARTER_ACCOUNTS) {
        await prisma.financialAccount.upsert({
          where: { ownerId_name: { ownerId: user.id, name: a.name } },
          update: {},
          create: { ownerId: user.id, name: a.name, type: a.type, subtype: a.subtype ?? null },
        });
      }
    }
  }
  console.log(`Seeded ${SEED_USERS.length} users (${isProduction ? "production" : "development"} mode).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
