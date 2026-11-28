import { Fragment, useEffect, useState } from "react";
import { useApi } from "../lib/useApi";
import { thb } from "../lib/format";
import type { AccountsResponse, Transaction } from "../lib/types";
import { FilterBar } from "../components/FilterBar";
import { LoadState } from "../components/LoadState";
import { Link } from "../lib/router";
import { api, ApiError } from "../lib/api";

// F-08: own transactions, newest first; each row can show its allocation lines.
export function HistoryPage() {
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useApi<{ transactions: Transaction[]; count: number }>(`/api/transactions${query}`);
  const accounts = useApi<AccountsResponse>("/api/accounts");
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Read the one-time "saved" message; remove it in an effect (StrictMode runs initializers twice).
  const [flash] = useState(() => sessionStorage.getItem("moneylog.flash"));
  useEffect(() => {
    sessionStorage.removeItem("moneylog.flash");
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  // F-11: delete after confirmation; no undo in Sprint 2.
  const remove = async (t: Transaction) => {
    if (!window.confirm("Delete this transaction? Balances will change.")) return;
    setActionError("");
    try {
      await api(`/api/transactions/${t.id}`, { method: "DELETE" });
      setNotice("Transaction deleted.");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not delete the transaction.");
    }
  };
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <>
      <h2>History</h2>
      {(notice ?? flash) && (
        <div className="success" role="status">
          {notice ?? flash}
        </div>
      )}
      {actionError && (
        <div className="alert" role="alert">
          {actionError}
        </div>
      )}
      {accounts.data && <FilterBar accounts={accounts.data.accounts} onApply={setQuery} />}
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && query && (
        <p className="muted" role="status" aria-live="polite">
          {data.count} transaction{data.count === 1 ? "" : "s"}
        </p>
      )}
      {data && query && data.transactions.length === 0 && <div className="card">No transaction matches these filters.</div>}
      {data && !query && data.transactions.length === 0 && (
        <div className="card">
          No transactions yet — <Link to="/transactions/new">record your first one</Link>.
        </div>
      )}
      {data && data.transactions.length > 0 && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table aria-label="Transactions">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Account</th>
                <th>Description</th>
                <th className="num">Total</th>
                <th aria-label="Lines"></th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <Fragment key={t.id}>
                  <tr data-testid="history-row">
                    <td style={{ whiteSpace: "nowrap" }}>{t.date}</td>
                    <td>{t.kind === "PAYMENT" ? "Payment" : "Received"}</td>
                    <td>{t.account.name}</td>
                    <td>{t.description || <span className="muted">—</span>}</td>
                    <td className="num">{thb(t.total)}</td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="link" aria-expanded={open.has(t.id)} onClick={() => toggle(t.id)}>
                        {open.has(t.id) ? "Hide lines" : `Show lines (${t.lines.length})`}
                      </button>{" "}
                      <Link to={`/transactions/${t.id}/edit`}>Edit</Link>{" "}
                      <button type="button" className="link danger" onClick={() => remove(t)} aria-label={`Delete ${t.description || "transaction"} of ${t.date}`}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  {open.has(t.id) &&
                    t.lines.map((l, i) => (
                      <tr key={i} className="muted">
                        <td></td>
                        <td colSpan={3}>↳ {l.account.name}</td>
                        <td className="num">{thb(l.amount)}</td>
                        <td></td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
