// F-17 change own password — contract docs/sprints/sprint-3/F-17-user-admin-and-password.md
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";

export function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (next !== confirm) {
      setError("The new password and its confirmation are different.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2>Change password</h2>
      <p className="muted">10 to 72 characters, with at least one letter and one digit. Your other sessions will be signed out.</p>
      <form className="card" onSubmit={submit} aria-label="Change password" style={{ maxWidth: 420 }}>
        <label htmlFor="pw-current">Current password</label>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <label htmlFor="pw-confirm">Confirm new password</label>
        <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <div className="alert" role="alert">{error}</div>}
        {done && <div className="success" role="status">Password changed.</div>}
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy || !current || !next || !confirm}>{busy ? "Saving…" : "Change password"}</button>
        </div>
      </form>
    </>
  );
}
