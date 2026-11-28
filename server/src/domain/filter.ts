// F-12 Search and filter — contract docs/sprints/sprint-2/F-12-search-and-filter.md
import type { Result, TransactionKind } from "./ledger";
import { isValidDate } from "./dates";
import { parseMoney } from "./money";

export interface TransactionFilter {
  from?: string;
  to?: string;
  accountId?: string;
  kind?: TransactionKind;
  q?: string;
  min?: number; // satang
  max?: number; // satang
  favorite?: boolean; // F-14
  limit: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_Q = 100;

/**
 * Validates the History query string. Empty values are ignored. Every problem is reported
 * with its field (400 VALIDATION_ERROR). The owner filter is applied by the route, never here.
 */
export function parseTransactionFilter(query: Record<string, unknown>): Result<TransactionFilter> {
  const get = (k: string) => {
    const v = query[k];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const errors: { field: string; message: string }[] = [];
  const out: TransactionFilter = { limit: 50 };

  for (const k of ["from", "to"] as const) {
    const v = get(k);
    if (v === undefined) continue;
    if (isValidDate(v)) out[k] = v;
    else errors.push({ field: k, message: "Use a valid date (YYYY-MM-DD)." });
  }
  if (out.from && out.to && out.from > out.to) errors.push({ field: "from", message: "From must be on or before To." });

  const accountId = get("accountId");
  if (accountId !== undefined) {
    if (UUID.test(accountId)) out.accountId = accountId;
    else errors.push({ field: "accountId", message: "Unknown account." });
  }

  const kind = get("kind");
  if (kind !== undefined) {
    if (kind === "PAYMENT" || kind === "RECEIPT") out.kind = kind;
    else errors.push({ field: "kind", message: "Type must be PAYMENT or RECEIPT." });
  }

  const q = get("q");
  if (q !== undefined) {
    if (q.length <= MAX_Q) out.q = q;
    else errors.push({ field: "q", message: `Text must be at most ${MAX_Q} characters.` });
  } else if (typeof query.q === "string" && query.q.length > MAX_Q) {
    errors.push({ field: "q", message: `Text must be at most ${MAX_Q} characters.` });
  }

  for (const k of ["min", "max"] as const) {
    const v = get(k);
    if (v === undefined) continue;
    const m = parseMoney(v, { allowZero: true });
    if (m.ok) out[k] = m.value;
    else errors.push({ field: k, message: "Use an amount of 0 or more with at most 2 decimals." });
  }
  if (out.min !== undefined && out.max !== undefined && out.min > out.max) errors.push({ field: "min", message: "Min must be at most Max." });

  // F-14: favorite=true|false (exact), anything else is refused.
  const favorite = typeof query.favorite === "string" && query.favorite !== "" ? query.favorite : undefined;
  if (favorite !== undefined) {
    if (favorite === "true" || favorite === "false") out.favorite = favorite === "true";
    else errors.push({ field: "favorite", message: "Favorite must be true or false." });
  }

  const limit = get("limit");
  if (limit !== undefined) {
    const n = Number(limit);
    if (Number.isInteger(n) && n >= 1 && n <= 200) out.limit = n;
    else errors.push({ field: "limit", message: "Limit must be 1 to 200." });
  }

  if (errors.length > 0) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Some filters are invalid.", details: errors } };
  return { ok: true, value: out };
}

