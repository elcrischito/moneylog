import { AuthProvider, useAuth } from "./lib/auth";
import { navigate, usePath } from "./lib/router";
import { LoginPage } from "./pages/LoginPage";
import { TopBar } from "./components/TopBar";
import { useEffect } from "react";

function Routes() {
  const { user, loading } = useAuth();
  const path = usePath();

  useEffect(() => {
    if (!loading && !user && path !== "/login") navigate("/login");
  }, [loading, user, path]);

  if (loading) return <main className="container">Loading…</main>;
  if (!user) return <LoginPage />;

  return (
    <>
      <TopBar />
      <main className="container">
        <h2>Welcome, {user.fullName}</h2>
        <p className="muted">MoneyLog Sprint 1.</p>
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
