import { useState, type FormEvent } from "react";
import { useApi } from "../lib/useApi";
import { api, ApiError } from "../lib/api";
import { thb, ACCOUNT_TYPE_LABEL, SUBTYPE_LABEL, todayIso } from "../lib/format";
import type { Account, AccountsResponse } from "../lib/types";
import { LoadState } from "../components/LoadState";

const TYPES = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"] as const;
const OPENING_TYPES = new Set(["CASH", "LOAN_TAKEN", "LOAN_GIVEN"]);

// F-03 accounts by type + F-04 opening balance + F-09 add / rename / deactivate.
export function AccountsPage() {
  const { data, error, loading, reload } = useApi<AccountsResponse>("/api/accounts");
  const [editing, setEditing] = useState<string | null>(null);
  const inactive = data?.accounts.filter((a) => !a.isActive) ?? [];

  return (
    <>
      <h2>Accounts</h2>
      <p className="muted">Balances are calculated from the opening balance and every transaction.</p>
      <LoadState loading={loading && !data} error={error} onRetry={reload} />
      {data && <AddAccountForm onDone={reload} />}
      {data &&
        TYPES.map((type) => {
          const list = data.accounts.filter((a) => a.type === type && a.isActive);
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
      {inactive.length > 0 && (
        <section className="card" aria-label="Inactive accounts">
          <h3>Inactive accounts</h3>
          <p className="muted">Not offered in new transactions. Past transactions and balances are kept.</p>
          <div className="table-wrap">
            <table>
              <tbody>
                {inactive.map((a) => (
                  <AccountRow key={a.id} account={a} editing={false} onEdit={() => {}} onDone={reload} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

const SUBTYPES: Partial<Record<Account["type"], Account["subtype"][]>> = {
  CASH: ["WALLET", "BANK"],
  LOAN_TAKEN: ["CREDIT_CARD", "OTHER_LOAN"],
};

// F-09: add an account (subtype only for Cash / Loan taken, BR-05).
export function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("EXPENSE");
  const [subtype, setSubtype] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = SUBTYPES[type];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/accounts", { method: "POST", body: { name, type, subtype: options ? subtype || null : null } });
      setName("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-label="Add account">
      <h3>Add account</h3>
      <form onSubmit={submit} className="row">
        <div>
          <label htmlFor="new-name">Name</label>
          <input id="new-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="new-type">Type</label>
          <select id="new-type" value={type} onChange={(e) => { setType(e.target.value as Account["type"]); setSubtype(""); }}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        {options && (
          <div>
            <label htmlFor="new-subtype">Subtype</label>
            <select id="new-subtype" value={subtype} onChange={(e) => setSubtype(e.target.value)}>
              <option value="">Choose…</option>
              {options.map((st) => (
                <option key={st!} value={st!}>{SUBTYPE_LABEL[st!]}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ flex: "0 0 auto" }}>
          <button type="submit" disabled={busy}>{busy ? "Adding…" : "Add account"}</button>
        </div>
        {error && (
          <div className="field-error" role="alert" style={{ flexBasis: "100%" }}>{error}</div>
        )}
      </form>
    </section>
  );
}

function AccountRow({ account, editing, onEdit, onDone }: { account: Account; editing: boolean; onEdit: () => void; onDone: () => void }) {
  const canOpen = OPENING_TYPES.has(account.type) && account.isActive;
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(account.name);
  const [error, setError] = useState("");

  const send = async (body: object) => {
    setError("");
    try {
      await api(`/api/accounts/${account.id}`, { method: "PATCH", body });
      setRenaming(false);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };
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
        <td className="num actions">
          {canOpen && !editing && (
            <button type="button" className="secondary" onClick={onEdit} aria-label={`Set opening balance for ${account.name}`}>
              Opening balance
            </button>
          )}
          <button type="button" className="secondary" onClick={() => { setNewName(account.name); setRenaming((r) => !r); }} aria-label={`Rename ${account.name}`}>
            Rename
          </button>
          <button type="button" className="secondary" onClick={() => send({ isActive: !account.isActive })} aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.name}`}>
            {account.isActive ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
      {renaming && (
        <tr>
          <td colSpan={3}>
            <form className="row" onSubmit={(e) => { e.preventDefault(); send({ name: newName }); }} aria-label={`Rename ${account.name}`}>
              <div>
                <label htmlFor={`rename-${account.id}`}>New name</label>
                <input id={`rename-${account.id}`} value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div style={{ flex: "0 0 auto" }}>
                <button type="submit">Save name</button>
              </div>
            </form>
          </td>
        </tr>
      )}
      {error && (
        <tr>
          <td colSpan={3}>
            <div className="field-error" role="alert">{error}</div>
          </td>
        </tr>
      )}
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
