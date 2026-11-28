// F-05 / F-06 record transactions, F-08 history, F-11 correction (edit / delete)
// Contract docs/sprints/sprint-1/F-05-F-06-record-transactions.md
// Mounted behind requireAuth + requireRole("USER").
import { Router } from "express";
import { prisma } from "../prisma";
import { AppError, asyncHandler, notFound } from "../http/errors";
import { validateTransaction } from "../domain/ledger";
import { parseTransactionFilter } from "../domain/filter";
import type { Prisma } from "@prisma/client";
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

// F-08 history + F-12 filters: own transactions only, newest first (BR-01).
// The owner condition is always applied first; no parameter can widen it.
transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = parseTransactionFilter(req.query as Record<string, unknown>);
    if (!parsed.ok) throw new AppError(400, parsed.error.code, parsed.error.message, parsed.error.details);
    const f = parsed.value;
    const where: Prisma.TransactionWhereInput = { ownerId: req.user!.id };
    const and: Prisma.TransactionWhereInput[] = [];
    if (f.from || f.to) where.date = { ...(f.from ? { gte: toDbDate(f.from) } : {}), ...(f.to ? { lte: toDbDate(f.to) } : {}) };
    if (f.kind) where.kind = f.kind;
    if (f.favorite !== undefined) where.isFavorite = f.favorite; // F-14
    if (f.min !== undefined || f.max !== undefined) {
      where.totalAmount = { ...(f.min !== undefined ? { gte: f.min } : {}), ...(f.max !== undefined ? { lte: f.max } : {}) };
    }
    if (f.accountId) and.push({ OR: [{ primaryAccountId: f.accountId }, { lines: { some: { accountId: f.accountId } } }] });
    if (and.length) where.AND = and;

    let rows = await prisma.transaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: f.q ? undefined : f.limit,
    });
    // Text search: case-insensitive "contains", with % and _ as literal characters.
    if (f.q) {
      const needle = f.q.toLocaleLowerCase();
      rows = rows.filter((t) => t.description.toLocaleLowerCase().includes(needle)).slice(0, f.limit);
    }
    res.json({ transactions: rows.map(transactionDto), count: rows.length });
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

// ---------------------------------------------------------------------------
// F-14 favorites — contract docs/sprints/sprint-3/F-14-favorites.md
// Only the flag changes; amounts, lines, dates and balances are untouched.
// ---------------------------------------------------------------------------
transactionsRouter.put(
  "/:id/favorite",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const isFavorite = req.body?.isFavorite;
    if (typeof isFavorite !== "boolean") {
      throw new AppError(400, "VALIDATION_ERROR", "isFavorite must be true or false.", [{ field: "isFavorite", message: "Must be a boolean." }]);
    }
    const { count } = await prisma.transaction.updateMany({ where: { id: req.params.id, ownerId }, data: { isFavorite } });
    if (count === 0) throw notFound("Transaction"); // other users' ids look unknown (BR-01, BR-17)
    res.json({ transaction: await loadTransactionDto(ownerId, req.params.id) });
  }),
);
