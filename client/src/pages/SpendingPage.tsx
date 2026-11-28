// F-13 Spending by category — contract docs/sprints/sprint-2/F-13-category-spending.md
import { useState, type FormEvent } from "react";
import { useApi } from "../lib/useApi";
import { thb, todayIso } from "../lib/format";
import type { SpendingResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";

export function SpendingPage() {
  const today = todayIso();
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState(`from=${from}&to=${to}`);
  const { data, error, loading, reload } = useApi<SpendingResponse>(`/api/spending?${query}`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(`from=${from}&to=${to}`);
  };

  return (
    <>
      <h2>Spending by category</h2>
      <p className="muted">Only expense lines count. Card repayments, loans, transfers and opening balances never do.</p>
      <form className="card row" onSubmit={submit} aria-label="Spending period">
        <div>
          <label htmlFor="sp-from">From</label>
          <input id="sp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="sp-to">To</label>
          <input id="sp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button type="submit">Show</button>
        </div>
      </form>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && <SpendingView data={data} />}
    </>
  );
}

export function SpendingView({ data }: { data: SpendingResponse }) {
  return (
    <section className="card">
      {data.categories.length === 0 ? (
        <p>No spending in this period.</p>
      ) : (
        <div className="table-wrap">
          <table aria-label="Spending by category">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="num">Amount</th>
                <th scope="col" className="num">Share</th>
                <th scope="col" aria-label="Bar"></th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c.accountId} data-testid="spending-row">
                  <td>{c.name}</td>
                  <td className="num">{thb(c.amount)}</td>
                  <td className="num">{c.share}%</td>
                  <td style={{ width: "40%" }}>
                    <div className="bar" aria-hidden="true">
                      <div className="bar-fill" style={{ width: `${c.share}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: 12 }}>
        <strong>Total spending:</strong> <span data-testid="spending-total">{thb(data.total)}</span>
      </p>
    </section>
  );
}
