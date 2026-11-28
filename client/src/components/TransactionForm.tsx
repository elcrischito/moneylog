import { useMemo, useState, type FormEvent } from "react";
import type { Account, AccountType } from "../lib/types";
import { ApiError } from "../lib/api";
import { thb, todayIso, ACCOUNT_TYPE_LABEL } from "../lib/format";
import { toSatang, satangToString } from "../lib/money";

export type Kind = "PAYMENT" | "RECEIPT";

export interface TransactionPayload {
  kind: Kind;
  date: string;
  description: string;
  accountId: string;
  total: string;
  lines: { accountId: string; amount: string }[];
}

// Same rules as BR-08 / BR-09 on the server (the server re-checks everything).
const ALLOWED: Record<Kind, { primary: AccountType[]; lines: AccountType[] }> = {
  PAYMENT: { primary: ["CASH", "LOAN_TAKEN"], lines: ["EXPENSE", "LOAN_TAKEN", "LOAN_GIVEN", "CASH"] },
  RECEIPT: { primary: ["CASH"], lines: ["INCOME", "LOAN_GIVEN", "LOAN_TAKEN", "CASH"] },
};
const LINE_GROUP_LABEL: Record<Kind, Partial<Record<AccountType, string>>> = {
  PAYMENT: { EXPENSE: "Expense", LOAN_TAKEN: "Repay a loan or card", LOAN_GIVEN: "Lend money", CASH: "Transfer to" },
  RECEIPT: { INCOME: "Income", LOAN_GIVEN: "Repayment received", LOAN_TAKEN: "Borrow", CASH: "Transfer from" },
};
const MAX_LINES = 20;

interface Line {
  accountId: string;
  amount: string;
}

export function TransactionForm({
  accounts,
  onSubmit,
  initial,
}: {
  accounts: Account[];
  onSubmit: (p: TransactionPayload) => Promise<void>;
  /** F-11 edit: pre-filled values of the original transaction. */
  initial?: TransactionPayload;
}) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "PAYMENT");
  const [accountId, setAccountId] = useState(initial?.accountId ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [total, setTotal] = useState(initial?.total ?? "");
  const [lines, setLines] = useState<Line[]>(initial?.lines.map((l) => ({ ...l })) ?? [{ accountId: "", amount: "" }]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // F-11: an inactive account is offered only where the original transaction already used it.
  const kept = useMemo(() => new Set(initial ? [initial.accountId, ...initial.lines.map((l) => l.accountId)] : []), [initial]);
  const active = accounts.filter((a) => a.isActive || kept.has(a.id));
  const primaryOptions = active.filter((a) => ALLOWED[kind].primary.includes(a.type));
  const lineTypes = ALLOWED[kind].lines;

  const totalSatang = toSatang(total);
  const linesSatang = lines.map((l) => toSatang(l.amount));
  const sum = linesSatang.reduce<number>((s, v) => s + (v ?? 0), 0);
  const remaining = (totalSatang ?? 0) - sum;
  const complete =
    Boolean(accountId) && totalSatang !== null && totalSatang > 0 && lines.every((l, i) => l.accountId && (linesSatang[i] ?? 0) > 0) && remaining === 0;

  const switchKind = (k: Kind) => {
    setKind(k);
    setAccountId("");
    setLines([{ accountId: "", amount: "" }]);
    setError("");
    setFieldErrors({});
  };
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      await onSubmit({ kind, date, description, accountId, total: total.trim(), lines: lines.map((l) => ({ accountId: l.accountId, amount: l.amount.trim() })) });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(Object.fromEntries(err.details.filter((d) => d.field).map((d) => [d.field!, d.message])));
      } else setError("Could not save the transaction.");
    } finally {
      setBusy(false);
    }
  };

  const lineOptions = useMemo(
    () =>
      lineTypes.map((type) => ({
        type,
        label: LINE_GROUP_LABEL[kind][type] ?? ACCOUNT_TYPE_LABEL[type],
        accounts: active.filter((a) => a.type === type && a.id !== accountId),
      })),
    [lineTypes, kind, active, accountId],
  );

  return (
    <form className="card" onSubmit={submit} noValidate aria-label="New transaction">
      <div className="tabs" role="tablist" aria-label="Transaction type">
        <button type="button" role="tab" aria-selected={kind === "PAYMENT"} onClick={() => switchKind("PAYMENT")}>
          Make a payment
        </button>
        <button type="button" role="tab" aria-selected={kind === "RECEIPT"} onClick={() => switchKind("RECEIPT")}>
          Receive money
        </button>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <div className="row">
        <div className="field">
          <label htmlFor="tx-account">{kind === "PAYMENT" ? "Paid from" : "Received into"}</label>
          <select id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Choose an account…</option>
            {primaryOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}{a.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
          {fieldErrors.accountId && <div className="field-error">{fieldErrors.accountId}</div>}
        </div>
        <div className="field">
          <label htmlFor="tx-date">Date</label>
          <input id="tx-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          {fieldErrors.date && <div className="field-error">{fieldErrors.date}</div>}
        </div>
        <div className="field">
          <label htmlFor="tx-total">Total (THB)</label>
          <input id="tx-total" inputMode="decimal" placeholder="0.00" value={total} onChange={(e) => setTotal(e.target.value)} />
          {total && totalSatang === null && <div className="field-error">Use a number with at most 2 decimals.</div>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="tx-description">Description</label>
        <input id="tx-description" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner and groceries" />
      </div>

      <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <legend style={{ fontWeight: 700 }}>Allocation lines</legend>
        {lines.map((l, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <div>
              <label htmlFor={`line-${i}-account`}>{`Line ${i + 1} account`}</label>
              <select id={`line-${i}-account`} value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                <option value="">Choose…</option>
                {lineOptions.map((g) =>
                  g.accounts.length ? (
                    <optgroup key={g.type} label={g.label}>
                      {g.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}{a.isActive ? "" : " (inactive)"}
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
              </select>
              {fieldErrors[`lines[${i}].accountId`] && <div className="field-error">{fieldErrors[`lines[${i}].accountId`]}</div>}
            </div>
            <div>
              <label htmlFor={`line-${i}-amount`}>{`Line ${i + 1} amount`}</label>
              <input id={`line-${i}-amount`} inputMode="decimal" placeholder="0.00" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
              {fieldErrors[`lines[${i}].amount`] && <div className="field-error">{fieldErrors[`lines[${i}].amount`]}</div>}
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <button
                type="button"
                className="secondary"
                disabled={lines.length === 1}
                aria-label={`Remove line ${i + 1}`}
                onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="row" style={{ alignItems: "center" }}>
          <div style={{ flex: "0 0 auto" }}>
            <button type="button" className="secondary" disabled={lines.length >= MAX_LINES} onClick={() => setLines((ls) => [...ls, { accountId: "", amount: "" }])}>
              + Add line
            </button>
          </div>
          <div data-testid="remaining" className={remaining === 0 ? "muted" : "field-error"} aria-live="polite" style={{ textAlign: "right" }}>
            Remaining to allocate: {thb(satangToString(remaining))}
          </div>
        </div>
        {fieldErrors.lines && <div className="field-error">{fieldErrors.lines}</div>}
      </fieldset>

      <button type="submit" disabled={!complete || busy}>
        {busy ? "Saving…" : "Save transaction"}
      </button>
    </form>
  );
}
