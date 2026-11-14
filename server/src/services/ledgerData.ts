// Loads one user's ledger. Every query is filtered by ownerId (BR-01): another user's
// rows are never loaded, so they can only ever look "not found".
import { prisma } from "../prisma";
import type { FinancialAccount } from "@prisma/client";
import { computeBalances, computeTotals, type LedgerAccount, type LedgerTransaction } from "../domain/ledger";
import { formatMoney } from "../domain/money";
import { fromDbDate } from "../domain/dates";

const TYPE_ORDER = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"];

export const toLedgerAccount = (a: FinancialAccount): LedgerAccount => ({
  id: a.id,
  type: a.type,
  subtype: a.subtype,
  openingBalance: a.openingBalance,
  isActive: a.isActive,
});

export async function loadLedger(ownerId: string) {
  const [accounts, txns] = await Promise.all([
    prisma.financialAccount.findMany({ where: { ownerId } }),
    prisma.transaction.findMany({ where: { ownerId }, include: { lines: true } }),
  ]);
  accounts.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name));
  const transactions: LedgerTransaction[] = txns.map((t) => ({
    kind: t.kind,
    date: fromDbDate(t.date)!,
    primaryAccountId: t.primaryAccountId,
    total: t.totalAmount,
    lines: t.lines.map((l) => ({ accountId: l.accountId, amount: l.amount })),
  }));
  const ledgerAccounts = accounts.map(toLedgerAccount);
  const balances = computeBalances(ledgerAccounts, transactions);
  return { accounts, ledgerAccounts, transactions, balances, totals: computeTotals(ledgerAccounts, balances) };
}

export const accountDto = (a: FinancialAccount, balance: number) => ({
  id: a.id,
  name: a.name,
  type: a.type,
  subtype: a.subtype,
  openingBalance: formatMoney(a.openingBalance),
  openingDate: fromDbDate(a.openingDate),
  balance: formatMoney(balance),
  isActive: a.isActive,
});
