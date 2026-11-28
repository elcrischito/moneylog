// F-10 Loans overview — contract docs/sprints/sprint-2/F-10-loans-overview.md
import { useApi } from "../lib/useApi";
import { thb, SUBTYPE_LABEL } from "../lib/format";
import type { LoanRow, LoansResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";

const STATUS_LABEL: Record<LoanRow["status"], string> = { OPEN: "Open", SETTLED: "Settled", OVERPAID: "Overpaid" };

export function LoansPage() {
  const { data, error, loading, reload } = useApi<LoansResponse>("/api/loans");
  return (
    <>
      <h2>Loans</h2>
      <p className="muted">Outstanding amounts are calculated from the opening balance and every transaction.</p>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && <LoansView data={data} />}
    </>
  );
}

export function LoansView({ data }: { data: LoansResponse }) {
  return (
    <>
      <LoanTable caption="I owe" rows={data.taken} />
      <LoanTable caption="Owed to me" rows={data.given} />
      <section className="card" aria-label="Loan totals">
        <dl className="totals">
          <div><dt>Total I owe</dt><dd>{thb(data.totals.taken)}</dd></div>
          <div><dt>Total owed to me</dt><dd>{thb(data.totals.given)}</dd></div>
          <div><dt>Net (owed to me − I owe)</dt><dd className={Number(data.totals.net) < 0 ? "negative" : ""}>{thb(data.totals.net)}</dd></div>
        </dl>
      </section>
    </>
  );
}

function LoanTable({ caption, rows }: { caption: string; rows: LoanRow[] }) {
  return (
    <section className="card">
      <div className="table-wrap">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col" className="num">Outstanding</th>
              <th scope="col">Status</th>
              <th scope="col" className="num">Opening</th>
              <th scope="col">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="muted">No loans.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  {r.subtype && <span className="muted"> · {SUBTYPE_LABEL[r.subtype]}</span>}
                  {!r.isActive && <span className="muted"> · inactive</span>}
                </td>
                <td className="num">{thb(r.outstanding)}</td>
                <td><span className={`status-badge status-${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span></td>
                <td className="num">{thb(r.openingBalance)}{r.openingDate && <div className="muted" style={{ fontSize: 13 }}>{r.openingDate}</div>}</td>
                <td>{r.lastActivity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
