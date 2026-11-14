import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";
import { formatMoney } from "../domain/money";
import { fromDbDate } from "../domain/dates";

export const TRANSACTION_INCLUDE = {
  primaryAccount: true,
  lines: { include: { account: true }, orderBy: { position: "asc" } },
} satisfies Prisma.TransactionInclude;

type Loaded = Prisma.TransactionGetPayload<{ include: typeof TRANSACTION_INCLUDE }>;

const accountRef = (a: { id: string; name: string; type: string }) => ({ id: a.id, name: a.name, type: a.type });

export const transactionDto = (t: Loaded) => ({
  id: t.id,
  kind: t.kind,
  date: fromDbDate(t.date),
  description: t.description,
  total: formatMoney(t.totalAmount),
  account: accountRef(t.primaryAccount),
  lines: t.lines.map((l) => ({ account: accountRef(l.account), amount: formatMoney(l.amount) })),
  isFavorite: t.isFavorite,
  createdAt: t.createdAt,
});

// Always scoped by owner (BR-01): returns null for another user's transaction.
export async function loadTransactionDto(ownerId: string, id: string) {
  const t = await prisma.transaction.findFirst({ where: { id, ownerId }, include: TRANSACTION_INCLUDE });
  return t ? transactionDto(t) : null;
}
