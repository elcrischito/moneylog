// F-07 Income and expense summary — contract docs/sprints/sprint-1/F-07-F-08-summary-and-history.md
// Mounted behind requireAuth + requireRole("USER").
import { Router } from "express";
import { asyncHandler, badRequest } from "../http/errors";
import { summarize } from "../domain/ledger";
import { formatMoney } from "../domain/money";
import { isValidDate, todayInBangkok } from "../domain/dates";
import { loadLedger } from "../services/ledgerData";

export const summaryRouter = Router();

summaryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const today = todayInBangkok();
    const from = req.query.from === undefined ? `${today.slice(0, 8)}01` : req.query.from;
    const to = req.query.to === undefined ? today : req.query.to;
    if (!isValidDate(from) || !isValidDate(to) || from > to) {
      throw badRequest("VALIDATION_ERROR", "Use valid dates (YYYY-MM-DD) with 'from' not after 'to'.", [
        { field: "from", message: "Invalid range." },
      ]);
    }
    const { accounts, ledgerAccounts, transactions } = await loadLedger(req.user!.id); // own data only
    const s = summarize(transactions, new Map(ledgerAccounts.map((a) => [a.id, a])), from, to);
    const name = new Map(accounts.map((a) => [a.id, a.name]));
    const rows = (list: { accountId: string; amount: number }[]) =>
      list.map((x) => ({ accountId: x.accountId, name: name.get(x.accountId) ?? "", amount: formatMoney(x.amount) }));
    res.json({
      from,
      to,
      income: { total: formatMoney(s.income.total), byAccount: rows(s.income.byAccount) },
      expense: { total: formatMoney(s.expense.total), byAccount: rows(s.expense.byAccount) },
      net: formatMoney(s.net),
    });
  }),
);
