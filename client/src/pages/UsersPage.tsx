import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
}

// F-02: platform access only. No financial data is requested or shown here.
export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(r.users);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load users.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (u: AdminUser) => {
    setBusyId(u.id);
    setError("");
    try {
      const r = await api<{ user: AdminUser }>(`/api/admin/users/${u.id}`, { method: "PATCH", body: { isActive: !u.isActive } });
      setUsers((list) => list?.map((x) => (x.id === u.id ? r.user : x)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the user.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h2>Users</h2>
      <p className="muted">Enable or disable access to MoneyLog. Administrators cannot see users' financial records.</p>
      {error && (
        <div className="alert" role="alert">
          {error} <button className="link" onClick={load}>Retry</button>
        </div>
      )}
      <CreateUserForm onCreated={load} />
      {notice && <div className="success" role="status">{notice}</div>}
      {!users && !error && <p>Loading…</p>}
      {users && (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>E-mail</th>
                <th>Role</th>
                <th>Status</th>
                <th aria-label="Action"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                <tr>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role === "ADMIN" ? "Administrator" : "User"}</td>
                  <td>
                    <span className={u.isActive ? "badge" : "badge off"}>{u.isActive ? "Enabled" : "Disabled"}</span>
                  </td>
                  <td className="num">
                    {u.role === "USER" && (
                      <button type="button" className="secondary" onClick={() => setResetting(resetting === u.id ? null : u.id)} aria-label={`Reset password of ${u.fullName}`}>
                        Reset password
                      </button>
                    )}{" "}
                    {u.id !== me?.id && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busyId === u.id}
                        onClick={() => toggle(u)}
                        aria-label={`${u.isActive ? "Disable" : "Enable"} ${u.fullName}`}
                      >
                        {u.isActive ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
                {resetting === u.id && (
                  <tr>
                    <td colSpan={5}>
                      <ResetPasswordForm user={u} onDone={(msg) => { setResetting(null); setNotice(msg); }} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// F-17: the administrator creates a USER (initial password, starter accounts on the server).
export function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCreated("");
    try {
      const r = await api<{ user: AdminUser }>("/api/admin/users", { method: "POST", body: { fullName, email, password } });
      setCreated(`User ${r.user.email} created.`);
      setFullName("");
      setEmail("");
      setPassword("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the user.");
    }
  };
  return (
    <section className="card" aria-label="Create user">
      <h3>Create user</h3>
      <form className="row" onSubmit={submit}>
        <div>
          <label htmlFor="cu-name">Full name</label>
          <input id="cu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cu-email">E-mail</label>
          <input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cu-password">Initial password</label>
          <input id="cu-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button type="submit">Create user</button>
        </div>
        {error && <div className="alert" role="alert" style={{ flexBasis: "100%" }}>{error}</div>}
        {created && <div className="success" role="status" style={{ flexBasis: "100%" }}>{created}</div>}
      </form>
    </section>
  );
}

function ResetPasswordForm({ user, onDone }: { user: AdminUser; onDone: (msg: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/admin/users/${user.id}/password`, { method: "POST", body: { password } });
      onDone(`Password of ${user.fullName} reset. Their sessions were signed out.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset the password.");
    }
  };
  return (
    <form className="row" onSubmit={submit} aria-label={`Reset password of ${user.fullName}`}>
      <div>
        <label htmlFor={`rp-${user.id}`}>New password for {user.fullName}</label>
        <input id={`rp-${user.id}`} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div style={{ flex: "0 0 auto" }}>
        <button type="submit">Save password</button>
      </div>
      {error && <div className="alert" role="alert" style={{ flexBasis: "100%" }}>{error}</div>}
    </form>
  );
}
