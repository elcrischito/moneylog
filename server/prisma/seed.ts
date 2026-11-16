// Idempotent seed (System SDS §2). Safe to rerun: it only creates what is missing and
// never changes an existing user's password (every Cloud Run release reruns it).
// - Passwords come from the environment, never from code. Accepted names:
//   SEED_ADMIN_PASSWORD or ADMIN_PASSWORD, SEED_USER_PASSWORD or DEMO_USER_PASSWORD
//   (the second names are the ones the Lab 5 deploy scripts use).
//   Outside production a documented local fallback is used so tests run out of the box.
// - The administrator is always created. Demo users and their accounts only when
//   SEED_DEMO_DATA=true (default: true locally, false in production).
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { STARTER_ACCOUNTS } from "./starter-accounts";

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === "production";
const LOCAL_FALLBACK_PASSWORD = "Password123!";
const seedDemoData = process.env.SEED_DEMO_DATA !== undefined ? process.env.SEED_DEMO_DATA === "true" : !isProduction;

function passwordFromEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  if (isProduction) throw new Error(`${names.join(" or ")} must be set when NODE_ENV=production`);
  return LOCAL_FALLBACK_PASSWORD;
}

export const SEED_USERS = [
  { email: "admin@moneylog.test", fullName: "Nok Administrator", role: Role.ADMIN, isActive: true },
  { email: "alice@moneylog.test", fullName: "Alice Wong", role: Role.USER, isActive: true },
  { email: "bob@moneylog.test", fullName: "Bob Chen", role: Role.USER, isActive: true },
  { email: "dan@moneylog.test", fullName: "Dan Disabled", role: Role.USER, isActive: false },
];


async function main() {
  const adminHash = await bcrypt.hash(passwordFromEnv("SEED_ADMIN_PASSWORD", "ADMIN_PASSWORD"), 10);
  const users = SEED_USERS.filter((u) => u.role === Role.ADMIN || seedDemoData);
  const userHash = seedDemoData ? await bcrypt.hash(passwordFromEnv("SEED_USER_PASSWORD", "DEMO_USER_PASSWORD"), 10) : "";

  for (const u of users) {
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
  console.log(`Seeded ${users.length} users (${isProduction ? "production" : "development"} mode, demo data ${seedDemoData ? "on" : "off"}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
