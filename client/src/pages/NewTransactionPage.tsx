import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import type { AccountsResponse, Transaction } from "../lib/types";
import { LoadState } from "../components/LoadState";
import { TransactionForm, type TransactionPayload } from "../components/TransactionForm";
import { navigate } from "../lib/router";
import { duplicatePayload } from "../lib/duplicate";
import { todayIso } from "../lib/format";

// F-05 / F-06: one form, two tabs. After saving, go to History with a confirmation.
// F-15: /transactions/new?from=<id> pre-fills a copy of an own transaction (date = today).
export function NewTransactionPage() {
  const from = new URLSearchParams(window.location.search).get("from");
  const { data, error, loading, reload } = useApi<AccountsResponse>("/api/accounts");
  const source = useApi<{ transaction: Transaction }>(from ? `/api/transactions/${encodeURIComponent(from)}` : null);

  const save = async (payload: TransactionPayload) => {
    await api("/api/transactions", { method: "POST", body: payload });
    sessionStorage.setItem("moneylog.flash", "Transaction saved.");
    navigate("/transactions");
  };

  const dup = data && source.data ? duplicatePayload(source.data.transaction, data.accounts, todayIso()) : null;
  const waiting = (loading && !data) || (Boolean(from) && source.loading && !source.data && !source.error);

  return (
    <>
      <h2>New transaction</h2>
      <p className="muted">Split the total across one or more lines. The lines must add up exactly to the total.</p>
      <LoadState loading={waiting} error={error} onRetry={reload} />
      {from && source.error && (
        <div className="alert" role="alert">
          Transaction not found.
        </div>
      )}
      {dup && source.data && (
        <div className="card" role="status" data-testid="duplicate-banner">
          Duplicated from {source.data.transaction.date} {source.data.transaction.description || "(no description)"}. Nothing is saved until you press Save.
          {dup.dropped > 0 && <div className="field-error">Some accounts of the original are inactive and were left empty.</div>}
        </div>
      )}
      {data && !waiting && <TransactionForm key={dup ? "dup" : "new"} accounts={data.accounts} initial={dup?.payload} onSubmit={save} />}
    </>
  );
}
