import { useState, type FormEvent } from "react";
import { useApi } from "../lib/useApi";
import { api, ApiError } from "../lib/api";
import { thb, ACCOUNT_TYPE_LABEL, SUBTYPE_LABEL, todayIso } from "../lib/format";
import type { Account, AccountsResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";

const TYPES = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"] as const;
const OPENING_TYPES = new Set(["CASH", "LOAN_TAKEN", "LOAN_GIVEN"]);

// F-03 accounts by type + F-04 opening balance form for cash and loan accounts.
export function AccountsPage() {
  const { data, error, loading, reload } = useApi<AccountsResponse>("/api/accounts");
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <h2>Accounts</h2>
      <p className="muted">Balances are calculated from the opening balance and every transaction.</p>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data &&
        TYPES.map((type) => {
          const list = data.accounts.filter((a) => a.type === type);
          if (list.length === 0) return null;
          return (
            <section className="card" key={type} aria-label={ACCOUNT_TYPE_LABEL[type]}>
              <h3>{ACCOUNT_TYPE_LABEL[type]}</h3>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {list.map((a) => (
                      <AccountRow
                        key={a.id}
                        account={a}
                        editing={editing === a.id}
                        onEdit={() => setEditing(a.id)}
                        onDone={() => {
                          setEditing(null);
                          reload();
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
    </>
  );
}

function AccountRow({ account, editing, onEdit, onDone }: { account: Account; editing: boolean; onEdit: () => void; onDone: () => void }) {
  const canOpen = OPENING_TYPES.has(account.type);
  return (
    <>
      <tr>
        <td>
          <strong>{account.name}</strong>
          {account.subtype && <span className="muted"> · {SUBTYPE_LABEL[account.subtype]}</span>}
          {canOpen && account.openingDate && (
            <div className="muted" style={{ fontSize: 13 }}>
              Opening {thb(account.openingBalance)} on {account.openingDate}
            </div>
          )}
        </td>
        <td className={`num ${account.type === "CASH" && Number(account.balance) < 0 ? "negative" : ""}`}>{thb(account.balance)}</td>
        <td className="num">
          {canOpen && !editing && (
            <button type="button" className="secondary" onClick={onEdit} aria-label={`Set opening balance for ${account.name}`}>
              Opening balance
            </button>
          )}
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={3}>
            <OpeningBalanceForm account={account} onDone={onDone} />
          </td>
        </tr>
      )}
    </>
  );
}

function OpeningBalanceForm({ account, onDone }: { account: Account; onDone: () => void }) {
  const [amount, setAmount] = useState(account.openingDate ? account.openingBalance : "");
  const [date, setDate] = useState(account.openingDate ?? todayIso());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/accounts/${account.id}/opening-balance`, { method: "PUT", body: { amount, date } });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="row" aria-label={`Opening balance for ${account.name}`}>
      <div>
        <label htmlFor={`ob-amount-${account.id}`}>Opening amount (THB)</label>
        <input id={`ob-amount-${account.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`ob-date-${account.id}`}>Opening date</label>
        <input id={`ob-date-${account.id}`} type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div style={{ flex: "0 0 auto" }}>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {error && (
        <div className="field-error" role="alert" style={{ flexBasis: "100%" }}>
          {error}
        </div>
      )}
    </form>
  );
}
