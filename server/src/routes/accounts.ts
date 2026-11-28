// F-03 Account balances, F-04 Opening balance, F-09 Manage accounts
// Contracts docs/sprints/sprint-1/F-03-F-04-accounts-and-opening-balance.md, docs/sprints/sprint-2/F-09-manage-accounts.md
// Mounted behind requireAuth + requireRole("USER").
import { Router } from "express";
import { prisma } from "../prisma";
import { AppError, asyncHandler, notFound } from "../http/errors";
import { formatMoney } from "../domain/money";
import { todayInBangkok, toDbDate } from "../domain/dates";
import { validateOpeningBalance } from "../domain/ledger";
import { MAX_ACCOUNTS_PER_USER, nameKey, validateAccountName, validateNewAccount } from "../domain/accounts";
import { Prisma } from "@prisma/client";
import { accountDto, loadLedger, toLedgerAccount } from "../services/ledgerData";

export const accountsRouter = Router();

accountsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { accounts, balances, totals } = await loadLedger(req.user!.id);
    res.json({
      accounts: accounts.map((a) => accountDto(a, balances.get(a.id) ?? 0)),
      totals: {
        cash: formatMoney(totals.cash),
        creditCardDebt: formatMoney(totals.creditCardDebt),
        loansTaken: formatMoney(totals.loansTaken),
        loansGiven: formatMoney(totals.loansGiven),
      },
    });
  }),
);

accountsRouter.put(
  "/:id/opening-balance",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const account = await prisma.financialAccount.findFirst({ where: { id: req.params.id, ownerId } });
    if (!account) throw notFound("Account"); // also for other users' accounts (BR-01)

    const result = validateOpeningBalance(toLedgerAccount(account), req.body?.amount, req.body?.date, todayInBangkok());
    if (!result.ok) throw new AppError(400, result.error.code, result.error.message, result.error.details);

    await prisma.financialAccount.update({
      where: { id: account.id },
      data: { openingBalance: result.value.amount, openingDate: toDbDate(result.value.date) }, // replaces (BR-13)
    });
    const { accounts, balances } = await loadLedger(ownerId);
    const updated = accounts.find((a) => a.id === account.id)!;
    res.json({ account: accountDto(updated, balances.get(updated.id) ?? 0) });
  }),
);

// ---------------------------------------------------------------------------
// F-09: add, rename, deactivate / reactivate own accounts. Never deleted.
// ---------------------------------------------------------------------------
const nameTaken = () => new AppError(409, "ACCOUNT_NAME_TAKEN", "You already have an account with this name.", [{ field: "name", message: "Name already used." }]);

async function assertNameFree(ownerId: string, name: string, exceptId?: string) {
  const own = await prisma.financialAccount.findMany({ where: { ownerId }, select: { id: true, name: true } });
  if (own.some((a) => a.id !== exceptId && nameKey(a.name) === nameKey(name))) throw nameTaken();
}

async function dtoFor(ownerId: string, id: string) {
  const { accounts, balances } = await loadLedger(ownerId);
  const a = accounts.find((x) => x.id === id)!;
  return accountDto(a, balances.get(a.id) ?? 0);
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

accountsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const v = validateNewAccount(req.body);
    if (!v.ok) throw new AppError(400, v.error.code, v.error.message, v.error.details);
    if ((await prisma.financialAccount.count({ where: { ownerId } })) >= MAX_ACCOUNTS_PER_USER) {
      throw new AppError(409, "ACCOUNT_LIMIT", `You can have at most ${MAX_ACCOUNTS_PER_USER} accounts.`);
    }
    await assertNameFree(ownerId, v.value.name);
    try {
      const created = await prisma.financialAccount.create({ data: { ownerId, ...v.value } });
      res.status(201).json({ account: await dtoFor(ownerId, created.id) });
    } catch (e) {
      if (isUniqueViolation(e)) throw nameTaken(); // race with a parallel request: exact-case index is the last guard
      throw e;
    }
  }),
);

const PATCHABLE = new Set(["name", "isActive"]);
const BALANCE_TYPES = new Set(["CASH", "LOAN_TAKEN", "LOAN_GIVEN"]);

accountsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const account = await prisma.financialAccount.findFirst({ where: { id: req.params.id, ownerId } });
    if (!account) throw notFound("Account"); // another user's account looks unknown (BR-01)

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
    const keys = Object.keys(body);
    if (keys.includes("type") || keys.includes("subtype")) {
      throw new AppError(400, "IMMUTABLE_FIELD", "Type and subtype cannot be changed after creation.", [{ field: keys.includes("type") ? "type" : "subtype", message: "Cannot be changed." }]);
    }
    const unknown = keys.filter((k) => !PATCHABLE.has(k));
    if (keys.length === 0 || unknown.length > 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Send name and/or isActive.", unknown.map((k) => ({ field: k, message: "Not allowed." })));
    }
    const data: { name?: string; isActive?: boolean } = {};
    if ("name" in body) {
      const n = validateAccountName(body.name);
      if (!n.ok) throw new AppError(400, n.error.code, n.error.message, n.error.details);
      await assertNameFree(ownerId, n.value, account.id);
      data.name = n.value;
    }
    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") throw new AppError(400, "VALIDATION_ERROR", "isActive must be true or false.", [{ field: "isActive", message: "Must be a boolean." }]);
      if (body.isActive === false && account.isActive && BALANCE_TYPES.has(account.type)) {
        const { balances } = await loadLedger(ownerId);
        const balance = balances.get(account.id) ?? 0;
        if (balance !== 0) {
          throw new AppError(409, "BALANCE_NOT_ZERO", `This account still has ${formatMoney(balance)}. Bring it to 0.00 before deactivating it.`, [{ field: "isActive", message: "Balance is not 0.00." }]);
        }
      }
      data.isActive = body.isActive;
    }
    try {
      await prisma.financialAccount.update({ where: { id: account.id }, data });
    } catch (e) {
      if (isUniqueViolation(e)) throw nameTaken();
      throw e;
    }
    res.json({ account: await dtoFor(ownerId, account.id) });
  }),
);
