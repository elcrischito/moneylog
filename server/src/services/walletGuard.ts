// CR-01 / BR-15 v2: refuse a transaction that would make a wallet negative.
// Runs INSIDE the insert's database transaction: the affected wallet rows are locked
// (SELECT ... FOR UPDATE) so two concurrent payments from the same wallet are serialised
// and cannot both pass the check.
import type { Prisma } from "@prisma/client";
import { AppError } from "../http/errors";
import { computeBalances, walletShortfalls, type LedgerAccount, type LedgerTransaction } from "../domain/ledger";
import { formatMoney } from "../domain/money";
import { fromDbDate } from "../domain/dates";
import { toLedgerAccount } from "./ledgerData";

type Tx = Prisma.TransactionClient;
type Candidate = Pick<LedgerTransaction, "kind" | "primaryAccountId" | "total" | "lines">;

export async function assertWalletFunds(tx: Tx, ownerId: string, candidate: Candidate, accounts: Map<string, LedgerAccount>) {
  const ids = [candidate.primaryAccountId, ...candidate.lines.map((l) => l.accountId)];
  const walletIds = [...new Set(ids)].filter((id) => accounts.get(id)?.subtype === "WALLET");
  if (walletIds.length === 0) return;

  // Lock the wallet rows in a fixed order (avoids deadlocks between two requests).
  walletIds.sort();
  await tx.$queryRaw`SELECT id FROM "FinancialAccount" WHERE id = ANY(${walletIds}::text[]) AND "ownerId" = ${ownerId} ORDER BY id FOR UPDATE`;

  const rows = await tx.financialAccount.findMany({ where: { ownerId, id: { in: walletIds } } });
  const txns = await tx.transaction.findMany({
    where: { ownerId, OR: [{ primaryAccountId: { in: walletIds } }, { lines: { some: { accountId: { in: walletIds } } } }] },
    include: { lines: true },
  });
  const ledgerAccounts = rows.map(toLedgerAccount);
  const history: LedgerTransaction[] = txns.map((t) => ({
    kind: t.kind,
    date: fromDbDate(t.date)!,
    primaryAccountId: t.primaryAccountId,
    total: t.totalAmount,
    lines: t.lines.map((l) => ({ accountId: l.accountId, amount: l.amount })),
  }));
  const balances = computeBalances(ledgerAccounts, history);
  const short = walletShortfalls(candidate, balances, new Map(ledgerAccounts.map((a) => [a.id, a])));
  if (short.length === 0) return;

  const names = new Map(rows.map((r) => [r.id, r.name]));
  // Point each message at the form field that uses the wallet (paying/receiving account or line).
  const fieldOf = (id: string) => {
    if (id === candidate.primaryAccountId) return "accountId";
    const i = candidate.lines.findIndex((l) => l.accountId === id);
    return `lines[${i}].accountId`;
  };
  const details = short.map((s) => ({
    field: fieldOf(s.accountId),
    message: `${names.get(s.accountId)} has ${formatMoney(s.available)} available; this would leave ${formatMoney(s.after)}. A wallet cannot go below 0.00.`,
  }));
  throw new AppError(400, "INSUFFICIENT_WALLET_FUNDS", details.map((d) => d.message).join(" "), details);
}
