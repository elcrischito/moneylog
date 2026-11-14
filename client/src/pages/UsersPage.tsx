import { useCallback, useEffect, useState } from "react";
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
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role === "ADMIN" ? "Administrator" : "User"}</td>
                  <td>
                    <span className={u.isActive ? "badge" : "badge off"}>{u.isActive ? "Enabled" : "Disabled"}</span>
                  </td>
                  <td className="num">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
