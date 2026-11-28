// F-05 / F-06 record transactions, F-08 history, F-11 correction (edit / delete)
// Contract docs/sprints/sprint-1/F-05-F-06-record-transactions.md
// Mounted behind requireAuth + requireRole("USER").
import { Router } from "express";
import { prisma } from "../prisma";
import { AppError, asyncHandler, notFound } from "../http/errors";
import { validateTransaction } from "../domain/ledger";
import { todayInBangkok, toDbDate } from "../domain/dates";
import { toLedgerAccount } from "../services/ledgerData";
import { assertWalletFunds } from "../services/walletGuard";
import { loadTransactionDto, transactionDto, TRANSACTION_INCLUDE } from "../services/transactionDto";

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
    // CR-01: the wallet check runs last (after ownership/type rules) and in the same DB transaction.
    const accountsMap = new Map(own.map((a) => [a.id, toLedgerAccount(a)]));
    const created = await prisma.$transaction(async (tx) => {
      await assertWalletFunds(tx, ownerId, v, accountsMap);
      return tx.transaction.create({
        data: {
          ownerId,
          kind: v.kind,
          date: toDbDate(v.date),
          description: v.description,
          totalAmount: v.total,
          primaryAccountId: v.primaryAccountId,
          lines: { create: v.lines.map((l, position) => ({ accountId: l.accountId, amount: l.amount, position })) },
        },
      });
    });
    res.status(201).json({ transaction: await loadTransactionDto(ownerId, created.id) });
  }),
);

// F-08 history: own transactions only, newest first (BR-01).
transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const requested = Number(req.query.limit);
    const take = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 200) : 50;
    const rows = await prisma.transaction.findMany({
      where: { ownerId: req.user!.id },
      include: TRANSACTION_INCLUDE,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
    });
    res.json({ transactions: rows.map(transactionDto) });
  }),
);

transactionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const transaction = await loadTransactionDto(req.user!.id, req.params.id);
    if (!transaction) throw notFound("Transaction"); // other users' ids look like unknown ids
    res.json({ transaction });
  }),
);

// ---------------------------------------------------------------------------
// F-11 correction — contract docs/sprints/sprint-2/F-11-transaction-correction.md v1.1
// ---------------------------------------------------------------------------
transactionsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const original = await prisma.transaction.findFirst({ where: { id: req.params.id, ownerId }, include: { lines: true } });
    if (!original) throw notFound("Transaction"); // another user's id looks unknown (BR-01)

    const own = await prisma.financialAccount.findMany({ where: { ownerId } });
    const accountsMap = new Map(own.map((a) => [a.id, toLedgerAccount(a)]));
    // Same rules as POST; an inactive account may stay only in the role the original used it in.
    const result = validateTransaction(req.body, accountsMap, todayInBangkok(), {
      primary: original.primaryAccountId,
      lines: new Set(original.lines.map((l) => l.accountId)),
    });
    if (!result.ok) throw new AppError(400, result.error.code, result.error.message, result.error.details);
    const v = result.value;

    // NFR-05: replace the transaction and all its lines atomically; id and createdAt are kept.
    await prisma.$transaction(async (tx) => {
      await assertWalletFunds(tx, ownerId, v, accountsMap, original.id); // CR-01, without the original's effect
      await tx.allocationLine.deleteMany({ where: { transactionId: original.id } });
      await tx.transaction.update({
        where: { id: original.id },
        data: {
          kind: v.kind,
          date: toDbDate(v.date),
          description: v.description,
          totalAmount: v.total,
          primaryAccountId: v.primaryAccountId,
          lines: { create: v.lines.map((l, position) => ({ accountId: l.accountId, amount: l.amount, position })) },
        },
      });
    });
    res.json({ transaction: await loadTransactionDto(ownerId, original.id) });
  }),
);

transactionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    // deleteMany scoped by owner: another user's id deletes nothing and answers 404 (BR-01).
    const { count } = await prisma.transaction.deleteMany({ where: { id: req.params.id, ownerId } }); // lines cascade
    if (count === 0) throw notFound("Transaction");
    res.status(204).end();
  }),
);
