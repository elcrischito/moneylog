import { useEffect, type ReactElement } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { navigate, usePath } from "./lib/router";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AccountsPage } from "./pages/AccountsPage";
import { NewTransactionPage } from "./pages/NewTransactionPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SummaryPage } from "./pages/SummaryPage";
import { LoansPage } from "./pages/LoansPage";
import { SpendingPage } from "./pages/SpendingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { EditTransactionPage } from "./pages/EditTransactionPage";
import { TopBar } from "./components/TopBar";

// Route table per role. The server enforces the same rules (System SDS §5).
const userRoutes: Record<string, () => ReactElement> = {
  "/": () => <DashboardPage />,
  "/accounts": () => <AccountsPage />,
  "/transactions/new": () => <NewTransactionPage />,
  "/transactions": () => <HistoryPage />,
  "/summary": () => <SummaryPage />,
  "/loans": () => <LoansPage />,
  "/spending": () => <SpendingPage />,
  "/reports": () => <ReportsPage />,
  "/password": () => <ChangePasswordPage />,
};
const adminRoutes: Record<string, () => ReactElement> = {
  "/admin/users": () => <UsersPage />,
  "/password": () => <ChangePasswordPage />,
};

// Routes with a parameter (F-11): /transactions/:id/edit, users only.
const EDIT = /^\/transactions\/([^/]+)\/edit$/;
function resolve(path: string, isAdmin: boolean): (() => ReactElement) | undefined {
  const routes = isAdmin ? adminRoutes : userRoutes;
  if (routes[path]) return routes[path];
  const m = !isAdmin ? EDIT.exec(path) : null;
  return m ? () => <EditTransactionPage id={decodeURIComponent(m[1])} /> : undefined;
}

function Routes() {
  const { user, loading } = useAuth();
  const path = usePath();
  const isAdmin = user?.role === "ADMIN";
  const routes = isAdmin ? adminRoutes : userRoutes;
  const home = isAdmin ? "/admin/users" : "/";

  useEffect(() => {
    if (loading) return;
    if (!user && path !== "/login") navigate("/login");
    else if (user && !resolve(path, isAdmin)) navigate(home);
  }, [loading, user, path, isAdmin, home]);

  if (loading) return <main className="container">Loading…</main>;
  if (!user) return <LoginPage />;
  const Page = resolve(path, isAdmin) ?? routes[home];

  return (
    <>
      <TopBar />
      <main className="container">
        <Page />
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
