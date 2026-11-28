// F-16 Reports — contract docs/sprints/sprint-3/F-16-reports.md
import { useState, type FormEvent } from "react";
import { useApi } from "../lib/useApi";
import { thb } from "../lib/format";
import type { ReportsResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";

export function ReportsPage() {
  const [months, setMonths] = useState("6");
  const [query, setQuery] = useState("6");
  const { data, error, loading, reload } = useApi<ReportsResponse>(`/api/reports/monthly?months=${encodeURIComponent(query)}`);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(months);
  };
  return (
    <>
      <h2>Reports</h2>
      <p className="muted">Income and expense per month, and your net position (cash + money owed to you − debts) at each month end.</p>
      <form className="card row" onSubmit={submit} aria-label="Report period">
        <div>
          <label htmlFor="rep-months">Months</label>
          <select id="rep-months" value={months} onChange={(e) => setMonths(e.target.value)}>
            {[3, 6, 12, 24].map((n) => (
              <option key={n} value={n}>Last {n} months</option>
            ))}
          </select>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button type="submit">Show</button>
        </div>
      </form>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && <ReportsView data={data} />}
    </>
  );
}

export function ReportsView({ data }: { data: ReportsResponse }) {
  const max = Math.max(1, ...data.months.flatMap((m) => [Number(m.income), Number(m.expense)]));
  return (
    <section className="card">
      <div className="report-chart" aria-hidden="true">
        {data.months.map((m) => (
          <div key={m.month} className="report-col">
            <div className="report-bars">
              <div className="bar-income" style={{ height: `${(Number(m.income) / max) * 100}%` }} />
              <div className="bar-expense" style={{ height: `${(Number(m.expense) / max) * 100}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{m.month.slice(5)}</div>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table aria-label="Monthly report">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col" className="num">Income</th>
              <th scope="col" className="num">Expense</th>
              <th scope="col" className="num">Net</th>
              <th scope="col" className="num">Net position at month end</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((m) => (
              <tr key={m.month} data-testid="report-row">
                <td>{m.month}{m.to.slice(8) !== lastDayOf(m.month) && <span className="muted"> (to {m.to})</span>}</td>
                <td className="num">{thb(m.income)}</td>
                <td className="num">{thb(m.expense)}</td>
                <td className={`num ${Number(m.net) < 0 ? "negative" : ""}`}>{thb(m.net)}</td>
                <td className={`num ${Number(m.netPosition) < 0 ? "negative" : ""}`}>{thb(m.netPosition)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function lastDayOf(month: string) {
  const [y, m] = month.split("-").map(Number);
  return String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0");
}
