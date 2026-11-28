// F-16 Reports — contract docs/sprints/sprint-3/F-16-reports.md
// Mounted behind requireAuth + requireRole("USER"); loadLedger reads only the caller's rows (BR-01).
import { Router } from "express";
import { asyncHandler, badRequest } from "../http/errors";
import { monthlyReport, parseMonths, MAX_REPORT_MONTHS } from "../domain/reports";
import { formatMoney } from "../domain/money";
import { fromDbDate, todayInBangkok } from "../domain/dates";
import { loadLedger } from "../services/ledgerData";

export const reportsRouter = Router();

reportsRouter.get(
  "/monthly",
  asyncHandler(async (req, res) => {
    const months = parseMonths(req.query.months);
    if (months === null) {
      throw badRequest("VALIDATION_ERROR", `months must be a whole number from 1 to ${MAX_REPORT_MONTHS}.`, [{ field: "months", message: "Invalid number of months." }]);
    }
    const { accounts, ledgerAccounts, transactions } = await loadLedger(req.user!.id);
    const opening = new Map(accounts.map((a) => [a.id, fromDbDate(a.openingDate)]));
    const rows = monthlyReport(ledgerAccounts.map((a) => ({ ...a, openingDate: opening.get(a.id) ?? null })), transactions, todayInBangkok(), months);
    res.json({
      months: rows.map((r) => ({
        month: r.month, from: r.from, to: r.to,
        income: formatMoney(r.income), expense: formatMoney(r.expense), net: formatMoney(r.net), netPosition: formatMoney(r.netPosition),
      })),
    });
  }),
);
