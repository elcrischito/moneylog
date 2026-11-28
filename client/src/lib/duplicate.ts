// F-15 Duplicate — contract docs/sprints/sprint-3/F-15-duplicate.md
import type { Account, Transaction } from "./types";
import type { TransactionPayload } from "../components/TransactionForm";

/** RED stub — implemented in the GREEN commit. */
export function duplicatePayload(_t: Transaction, _accounts: Account[], _today: string): { payload: TransactionPayload; dropped: number } {
  return { payload: { kind: "PAYMENT", date: "", description: "", accountId: "", total: "", lines: [] }, dropped: 0 };
}
