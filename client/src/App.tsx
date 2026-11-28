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
import { TopBar } from "./components/TopBar";

// Route table per role. The server enforces the same rules (System SDS §5).
const userRoutes: Record<string, () => ReactElement> = {
  "/": () => <DashboardPage />,
  "/accounts": () => <AccountsPage />,
  "/transactions/new": () => <NewTransactionPage />,
  "/transactions": () => <HistoryPage />,
  "/summary": () => <SummaryPage />,
  "/loans": () => <LoansPage />,
};
const adminRoutes: Record<string, () => ReactElement> = {
  "/admin/users": () => <UsersPage />,
};

function Routes() {
  const { user, loading } = useAuth();
  const path = usePath();
  const routes = user?.role === "ADMIN" ? adminRoutes : userRoutes;
  const home = user?.role === "ADMIN" ? "/admin/users" : "/";

  useEffect(() => {
    if (loading) return;
    if (!user && path !== "/login") navigate("/login");
    else if (user && !routes[path]) navigate(home);
  }, [loading, user, path, routes, home]);

  if (loading) return <main className="container">Loading…</main>;
  if (!user) return <LoginPage />;
  const Page = routes[path] ?? routes[home];

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
