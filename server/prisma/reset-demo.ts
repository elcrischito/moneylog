// Local/E2E helper: puts the seeded demo users back to their starting state
// (no transactions, zero opening balances, everyone except Dan enabled, no sessions).
// Refuses to run in production.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("reset-demo must not run in production");
  const emails = ["alice@moneylog.test", "bob@moneylog.test", "dan@moneylog.test", "admin@moneylog.test"];
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  const ids = users.map((u) => u.id);
  await prisma.allocationLine.deleteMany({ where: { transaction: { ownerId: { in: ids } } } });
  await prisma.transaction.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.financialAccount.updateMany({ where: { ownerId: { in: ids } }, data: { openingBalance: 0, openingDate: null } });
  await prisma.user.updateMany({ where: { email: { in: ["alice@moneylog.test", "bob@moneylog.test", "admin@moneylog.test"] } }, data: { isActive: true } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  console.log("Demo data reset.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
