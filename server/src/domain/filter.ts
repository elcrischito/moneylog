// F-12 Search and filter — contract docs/sprints/sprint-2/F-12-search-and-filter.md
import type { Result, TransactionKind } from "./ledger";

export interface TransactionFilter {
  from?: string;
  to?: string;
  accountId?: string;
  kind?: TransactionKind;
  q?: string;
  min?: number; // satang
  max?: number; // satang
  limit: number;
}

/** RED stub — implemented in the GREEN commit. */
export function parseTransactionFilter(_query: Record<string, unknown>): Result<TransactionFilter> {
  return { ok: true, value: { limit: 50 } };
}
