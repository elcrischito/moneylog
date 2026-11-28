// F-14 star toggle — contract docs/sprints/sprint-3/F-14-favorites.md
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Transaction } from "../lib/types";

export function FavoriteButton({ tx, onChange }: { tx: Transaction; onChange?: (t: Transaction) => void }) {
  const [on, setOn] = useState(tx.isFavorite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = `${tx.description || "transaction"} of ${tx.date}`;

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ transaction: Transaction }>(`/api/transactions/${tx.id}/favorite`, { method: "PUT", body: { isFavorite: !on } });
      setOn(res.transaction.isFavorite);
      onChange?.(res.transaction);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the favorite.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="link star"
        aria-pressed={on}
        aria-label={on ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
        disabled={busy}
        onClick={toggle}
      >
        {on ? "★" : "☆"}
      </button>
      {error && <span className="field-error" role="alert">{error}</span>}
    </>
  );
}
