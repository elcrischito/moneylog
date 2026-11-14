import { Fragment, useEffect, useState } from "react";
import { useApi } from "../lib/useApi";
import { thb } from "../lib/format";
import type { Transaction } from "../lib/types";
import { LoadState } from "../components/LoadState";
import { Link } from "../lib/router";

// F-08: own transactions, newest first; each row can show its allocation lines.
export function HistoryPage() {
  const { data, error, loading, reload } = useApi<{ transactions: Transaction[] }>("/api/transactions");
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Read the one-time "saved" message; remove it in an effect (StrictMode runs initializers twice).
  const [flash] = useState(() => sessionStorage.getItem("moneylog.flash"));
  useEffect(() => {
    sessionStorage.removeItem("moneylog.flash");
  }, []);
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <>
      <h2>History</h2>
      {flash && (
        <div className="success" role="status">
          {flash}
        </div>
      )}
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && data.transactions.length === 0 && (
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
                    <td className="num">
                      <button type="button" className="link" aria-expanded={open.has(t.id)} onClick={() => toggle(t.id)}>
                        {open.has(t.id) ? "Hide lines" : `Show lines (${t.lines.length})`}
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
