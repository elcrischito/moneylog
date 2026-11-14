// F-03 Account balances and F-04 Opening balance
// Contract docs/sprints/sprint-1/F-03-F-04-accounts-and-opening-balance.md
// Mounted behind requireAuth + requireRole("USER").
import { Router } from "express";
import { prisma } from "../prisma";
import { AppError, asyncHandler, notFound } from "../http/errors";
import { formatMoney } from "../domain/money";
import { todayInBangkok, toDbDate } from "../domain/dates";
import { validateOpeningBalance } from "../domain/ledger";
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
