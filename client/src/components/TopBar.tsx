import { useAuth } from "../lib/auth";
import { Link, navigate, usePath } from "../lib/router";

const USER_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/accounts", label: "Accounts" },
  { to: "/transactions/new", label: "New transaction" },
  { to: "/transactions", label: "History" },
  { to: "/summary", label: "Summary" },
  { to: "/loans", label: "Loans" },
  { to: "/spending", label: "Spending" },
];
const ADMIN_LINKS = [{ to: "/admin/users", label: "Users" }];

// Links depend on the role (TEST-UI-03). This is only convenience: the API enforces access.
export function TopBar() {
  const { user, logout } = useAuth();
  const path = usePath();
  if (!user) return null;
  const links = user.role === "ADMIN" ? ADMIN_LINKS : USER_LINKS;
  return (
    <header className="topbar">
      <nav className="inner" aria-label="Main">
        <span className="brand">MoneyLog</span>
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={path === l.to ? "active" : undefined}>
            {l.label}
          </Link>
        ))}
        <span className="who">
          {user.fullName} · {user.role === "ADMIN" ? "Administrator" : "User"}
        </span>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
