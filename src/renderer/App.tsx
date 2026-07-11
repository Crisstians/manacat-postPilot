import { AuthGate, AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { MainApp } from "./components/MainApp";

function AppContent() {
  const { status } = useAuth();

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AuthProvider>
  );
}
