// F-11 edit a transaction — contract docs/sprints/sprint-2/F-11-transaction-correction.md v1.1
import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import type { AccountsResponse, Transaction } from "../lib/types";
import { LoadState } from "../components/LoadState";
import { TransactionForm, type TransactionPayload } from "../components/TransactionForm";
import { navigate } from "../lib/router";

export const toPayload = (t: Transaction): TransactionPayload => ({
  kind: t.kind,
  date: t.date,
  description: t.description,
  accountId: t.account.id,
  total: t.total,
  lines: t.lines.map((l) => ({ accountId: l.account.id, amount: l.amount })),
});

export function EditTransactionPage({ id }: { id: string }) {
  const accounts = useApi<AccountsResponse>("/api/accounts");
  const tx = useApi<{ transaction: Transaction }>(`/api/transactions/${id}`);

  const save = async (payload: TransactionPayload) => {
    await api(`/api/transactions/${id}`, { method: "PUT", body: payload });
    sessionStorage.setItem("moneylog.flash", "Transaction updated.");
    navigate("/transactions");
  };

  return (
    <>
      <h2>Edit transaction</h2>
      <p className="muted">Every rule of a new transaction applies. The lines must add up exactly to the total.</p>
      <LoadState loading={(accounts.loading && !accounts.data) || (tx.loading && !tx.data)} error={accounts.error || tx.error} onRetry={() => { accounts.reload(); tx.reload(); }} />
      {accounts.data && tx.data && <TransactionForm accounts={accounts.data.accounts} initial={toPayload(tx.data.transaction)} onSubmit={save} />}
    </>
  );
}
