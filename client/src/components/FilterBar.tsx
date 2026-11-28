// F-12 History filter bar — contract docs/sprints/sprint-2/F-12-search-and-filter.md
import { useState, type FormEvent } from "react";
import type { Account } from "../lib/types";

export interface Filters {
  from: string;
  to: string;
  accountId: string;
  kind: string;
  q: string;
  min: string;
  max: string;
  favorite: string; // F-14: "true" or ""
}
const EMPTY: Filters = { from: "", to: "", accountId: "", kind: "", q: "", min: "", max: "", favorite: "" };

/** Query string built from the filled fields only ("" when nothing is filled). */
export function buildQuery(f: Filters): string {
  const p = new URLSearchParams();
  (Object.keys(EMPTY) as (keyof Filters)[]).forEach((k) => {
    const v = f[k].trim();
    if (v) p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function FilterBar({ accounts, onApply }: { accounts: Account[]; onApply: (query: string) => void }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (k: keyof Filters) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply(buildQuery(f));
  };
  const clear = () => {
    setF(EMPTY);
    onApply("");
  };

  return (
    <form className="card row filter-bar" onSubmit={submit} aria-label="Filter transactions">
      <div>
        <label htmlFor="f-from">From</label>
        <input id="f-from" type="date" value={f.from} onChange={set("from")} />
      </div>
      <div>
        <label htmlFor="f-to">To</label>
        <input id="f-to" type="date" value={f.to} onChange={set("to")} />
      </div>
      <div>
        <label htmlFor="f-account">Account</label>
        <select id="f-account" value={f.accountId} onChange={set("accountId")}>
          <option value="">Any account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{a.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-kind">Type</label>
        <select id="f-kind" value={f.kind} onChange={set("kind")}>
          <option value="">Any</option>
          <option value="PAYMENT">Payment</option>
          <option value="RECEIPT">Receipt</option>
        </select>
      </div>
      <div>
        <label htmlFor="f-q">Text</label>
        <input id="f-q" value={f.q} maxLength={100} onChange={set("q")} />
      </div>
      <div>
        <label htmlFor="f-min">Min total</label>
        <input id="f-min" inputMode="decimal" value={f.min} onChange={set("min")} />
      </div>
      <div>
        <label htmlFor="f-max">Max total</label>
        <input id="f-max" inputMode="decimal" value={f.max} onChange={set("max")} />
      </div>
      <div style={{ flex: "0 0 auto", alignSelf: "center" }}>
        <label className="checkbox">
          <input type="checkbox" checked={f.favorite === "true"} onChange={(e) => setF((x) => ({ ...x, favorite: e.target.checked ? "true" : "" }))} /> Favorites only
        </label>
      </div>
      <div style={{ flex: "0 0 auto", display: "flex", gap: 6 }}>
        <button type="submit">Apply</button>
        <button type="button" className="secondary" onClick={clear}>Clear</button>
      </div>
    </form>
  );
}
