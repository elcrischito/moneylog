// F-05 / F-06 record transactions (and F-08 history in a later PR)
// Contract docs/sprints/sprint-1/F-05-F-06-record-transactions.md
// Mounted behind requireAuth + requireRole("USER").
import { Router } from "express";
import { prisma } from "../prisma";
import { AppError, asyncHandler } from "../http/errors";
import { validateTransaction } from "../domain/ledger";
import { todayInBangkok, toDbDate } from "../domain/dates";
import { toLedgerAccount } from "../services/ledgerData";
import { loadTransactionDto } from "../services/transactionDto";

export const transactionsRouter = Router();

transactionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    // Only the caller's accounts are offered to the validator (BR-10).
    const own = await prisma.financialAccount.findMany({ where: { ownerId } });
    const result = validateTransaction(req.body, new Map(own.map((a) => [a.id, toLedgerAccount(a)])), todayInBangkok());
    if (!result.ok) throw new AppError(400, result.error.code, result.error.message, result.error.details);

    const v = result.value;
    // NFR-05: the transaction and all its lines are written in one database transaction.
    const created = await prisma.$transaction(async (tx) =>
      tx.transaction.create({
        data: {
          ownerId,
          kind: v.kind,
          date: toDbDate(v.date),
          description: v.description,
          totalAmount: v.total,
          primaryAccountId: v.primaryAccountId,
          lines: { create: v.lines.map((l, position) => ({ accountId: l.accountId, amount: l.amount, position })) },
        },
      }),
    );
    res.status(201).json({ transaction: await loadTransactionDto(ownerId, created.id) });
  }),
);
