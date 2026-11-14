import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import type { AccountsResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";
import { TransactionForm, type TransactionPayload } from "../components/TransactionForm";
import { navigate } from "../lib/router";

// F-05 / F-06: one form, two tabs. After saving, go to History with a confirmation.
export function NewTransactionPage() {
  const { data, error, loading, reload } = useApi<AccountsResponse>("/api/accounts");

  const save = async (payload: TransactionPayload) => {
    await api("/api/transactions", { method: "POST", body: payload });
    sessionStorage.setItem("moneylog.flash", "Transaction saved.");
    navigate("/transactions");
  };

  return (
    <>
      <h2>New transaction</h2>
      <p className="muted">Split the total across one or more lines. The lines must add up exactly to the total.</p>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && <TransactionForm accounts={data.accounts} onSubmit={save} />}
    </>
  );
}
