// F-13 Spending by category — contract docs/sprints/sprint-2/F-13-category-spending.md
// Mounted behind requireAuth + requireRole("USER"); loadLedger reads only the caller's rows (BR-01).
import { Router } from "express";
import { asyncHandler, badRequest } from "../http/errors";
import { categorySpending } from "../domain/spending";
import { formatMoney } from "../domain/money";
import { isValidDate, todayInBangkok } from "../domain/dates";
import { loadLedger } from "../services/ledgerData";

export const spendingRouter = Router();

spendingRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const today = todayInBangkok();
    const from = req.query.from === undefined ? `${today.slice(0, 8)}01` : req.query.from;
    const to = req.query.to === undefined ? today : req.query.to;
    if (!isValidDate(from) || !isValidDate(to) || from > to) {
      throw badRequest("VALIDATION_ERROR", "Use valid dates (YYYY-MM-DD) with 'from' not after 'to'.", [{ field: "from", message: "Invalid range." }]);
    }
    const { accounts, transactions } = await loadLedger(req.user!.id);
    const s = categorySpending(accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })), transactions, from, to);
    res.json({
      from,
      to,
      total: formatMoney(s.total),
      categories: s.categories.map((c) => ({ accountId: c.accountId, name: c.name, amount: formatMoney(c.amount), share: c.share })),
    });
  }),
);
