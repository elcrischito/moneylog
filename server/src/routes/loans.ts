// F-10 Loans overview — contract docs/sprints/sprint-2/F-10-loans-overview.md
// Mounted behind requireAuth + requireRole("USER"); loadLedger only reads the caller's rows (BR-01).
import { Router } from "express";
import { asyncHandler } from "../http/errors";
import { loadLedger } from "../services/ledgerData";
import { loanOverview, type LoanRow } from "../domain/loans";
import { formatMoney } from "../domain/money";
import { fromDbDate } from "../domain/dates";

export const loansRouter = Router();

const rowDto = (r: LoanRow) => ({
  id: r.id,
  name: r.name,
  subtype: r.subtype,
  isActive: r.isActive,
  outstanding: formatMoney(r.outstanding),
  openingBalance: formatMoney(r.openingBalance),
  openingDate: r.openingDate,
  lastActivity: r.lastActivity,
  status: r.status,
});

loansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { accounts, balances, transactions } = await loadLedger(req.user!.id);
    const o = loanOverview(
      accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, subtype: a.subtype, isActive: a.isActive, openingBalance: a.openingBalance, openingDate: fromDbDate(a.openingDate) })),
      balances,
      transactions,
    );
    res.json({
      taken: o.taken.map(rowDto),
      given: o.given.map(rowDto),
      totals: { taken: formatMoney(o.totals.taken), given: formatMoney(o.totals.given), net: formatMoney(o.totals.net) },
    });
  }),
);
