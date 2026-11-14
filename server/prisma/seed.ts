// Idempotent seed (System SDS §2). Safe to rerun: it only creates what is missing.
// Passwords come from SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD. Outside production a
// documented local fallback is used so that tests and local runs work out of the box.
import { PrismaClient, Role, AccountType, AccountSubtype } from "@prisma/client";
import bcrypt from "bcryptjs";

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

// The theme's Sprint 1 example: a bank account, a credit card, income and expense accounts.
export const STARTER_ACCOUNTS: { name: string; type: AccountType; subtype?: AccountSubtype }[] = [
  { name: "Bangkok Bank Savings", type: AccountType.CASH, subtype: AccountSubtype.BANK },
  { name: "Wallet", type: AccountType.CASH, subtype: AccountSubtype.WALLET },
  { name: "KTC Credit Card", type: AccountType.LOAN_TAKEN, subtype: AccountSubtype.CREDIT_CARD },
  { name: "Loan from Mom", type: AccountType.LOAN_TAKEN, subtype: AccountSubtype.OTHER_LOAN },
  { name: "Loan to Ploy", type: AccountType.LOAN_GIVEN },
  { name: "Salary", type: AccountType.INCOME },
  { name: "Interest Earned", type: AccountType.INCOME },
  { name: "Dining", type: AccountType.EXPENSE },
  { name: "Groceries", type: AccountType.EXPENSE },
  { name: "Electricity", type: AccountType.EXPENSE },
  { name: "Telecom", type: AccountType.EXPENSE },
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
