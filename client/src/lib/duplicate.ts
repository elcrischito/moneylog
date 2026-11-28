// F-15 Duplicate — contract docs/sprints/sprint-3/F-15-duplicate.md
import type { Account, Transaction } from "./types";
import type { TransactionPayload } from "../components/TransactionForm";

/**
 * Pre-fill for a new transaction copied from `t`: same kind, account, description, total
 * and lines, date = today. Accounts that are now inactive (or unknown) are cleared, so the
 * user must choose an active one (AC-15-3). Nothing is sent to the original (BR-17).
 */
export function duplicatePayload(t: Transaction, accounts: Account[], today: string): { payload: TransactionPayload; dropped: number } {
  const active = new Set(accounts.filter((a) => a.isActive).map((a) => a.id));
  let dropped = 0;
  const keep = (id: string) => {
    if (active.has(id)) return id;
    dropped += 1;
    return "";
  };
  const payload: TransactionPayload = {
    kind: t.kind,
    date: today,
    description: t.description,
    accountId: keep(t.account.id),
    total: t.total,
    lines: t.lines.map((l) => ({ accountId: keep(l.account.id), amount: l.amount })),
  };
  return { payload, dropped };
}
