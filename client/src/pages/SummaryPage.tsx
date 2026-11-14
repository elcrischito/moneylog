import { useState, type FormEvent } from "react";
import { useApi } from "../lib/useApi";
import { thb, todayIso } from "../lib/format";
import type { SummaryResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";

// F-07: income, expense and net for a date range, per account. Transfers, borrowing,
// repayments and opening balances never appear here (BR-12).
export function SummaryPage() {
  const today = todayIso();
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState(`from=${from}&to=${to}`);
  const { data, error, loading, reload } = useApi<SummaryResponse>(`/api/summary?${query}`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(`from=${from}&to=${to}`);
  };

  return (
    <>
      <h2>Income and expense summary</h2>
      <form className="card row" onSubmit={submit} aria-label="Date range">
        <div>
          <label htmlFor="sum-from">From</label>
          <input id="sum-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="sum-to">To</label>
          <input id="sum-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button type="submit">Show</button>
        </div>
      </form>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && <SummaryView data={data} />}
    </>
  );
}

export function SummaryView({ data }: { data: SummaryResponse }) {
  return (
    <>
      <section className="grid" aria-label="Summary totals">
        <div className="card stat">
          <div className="label">Income</div>
          <div className="value" data-testid="summary-income">{thb(data.income.total)}</div>
        </div>
        <div className="card stat">
          <div className="label">Expense</div>
          <div className="value" data-testid="summary-expense">{thb(data.expense.total)}</div>
        </div>
        <div className="card stat">
          <div className="label">Net</div>
          <div className={`value ${Number(data.net) < 0 ? "negative" : ""}`} data-testid="summary-net">{thb(data.net)}</div>
        </div>
      </section>
      <div className="grid">
        {(["income", "expense"] as const).map((k) => (
          <section className="card" key={k}>
            <h3>{k === "income" ? "Income by account" : "Spending by category"}</h3>
            {data[k].byAccount.length === 0 ? (
              <p className="muted">Nothing in this period.</p>
            ) : (
              <table>
                <tbody>
                  {data[k].byAccount.map((r) => (
                    <tr key={r.accountId}>
                      <td>{r.name}</td>
                      <td className="num">{thb(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
