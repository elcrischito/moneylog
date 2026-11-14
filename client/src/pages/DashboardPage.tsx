import { useAuth } from "../lib/auth";
import { useApi } from "../lib/useApi";
import { thb, ACCOUNT_TYPE_LABEL } from "../lib/format";
import type { AccountsResponse, SummaryResponse } from "../lib/types";
import { SummaryView } from "./SummaryPage";
import { LoadState } from "../components/LoadState";
import { Link } from "../lib/router";

// F-03 overview: the four totals, then every balance by type.
export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<AccountsResponse>("/api/accounts");
  const month = useApi<SummaryResponse>("/api/summary");

  return (
    <>
      <h2>Hello, {user?.fullName.split(" ")[0]}</h2>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <section className="grid" aria-label="Totals">
            <Stat label="Cash and bank" value={data.totals.cash} testId="total-cash" />
            <Stat label="Credit card debt" value={data.totals.creditCardDebt} testId="total-card-debt" />
            <Stat label="Loans taken (incl. cards)" value={data.totals.loansTaken} testId="total-loans-taken" />
            <Stat label="Loans given (owed to you)" value={data.totals.loansGiven} testId="total-loans-given" />
          </section>
          <p>
            <Link to="/transactions/new">+ Record a transaction</Link>
          </p>
          <section className="card">
            <h3>Balances</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts
                    .filter((a) => a.type !== "INCOME" && a.type !== "EXPENSE")
                    .map((a) => (
                      <tr key={a.id} data-testid={`balance-${a.name}`}>
                        <td>{a.name}</td>
                        <td className="muted">{ACCOUNT_TYPE_LABEL[a.type]}</td>
                        <td className={`num ${a.type === "CASH" && Number(a.balance) < 0 ? "negative" : ""}`}>{thb(a.balance)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
          {month.data && (
            <section aria-label="This month">
              <h3>This month ({month.data.from} to {month.data.to})</h3>
              <SummaryView data={month.data} />
            </section>
          )}
        </>
      )}
    </>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className={`value ${Number(value) < 0 ? "negative" : ""}`} data-testid={testId}>
        {thb(value)}
      </div>
    </div>
  );
}
