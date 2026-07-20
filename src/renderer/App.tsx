import { useEffect, useState } from "react";
import { AuthGate, AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AnnouncementEditorApp } from "./components/AnnouncementEditorApp";
import { HomePage } from "./components/HomePage";
import { LoginPage } from "./components/LoginPage";
import { MainApp } from "./components/MainApp";
import { UpdateNotifier } from "./components/UpdateNotifier";
import type { PostTypeId } from "../shared/postTypes";

async function loadFlyonUI() {
  return import("flyonui/flyonui");
}

type AppScreen = { view: "home" } | { view: "editor"; postType: PostTypeId };

function AppContent() {
  const { status, logout } = useAuth();
  const [screen, setScreen] = useState<AppScreen>({ view: "home" });
  const [logoutBusy, setLogoutBusy] = useState(false);

  const onLogout = async () => {
    setLogoutBusy(true);
    try {
      await logout();
      setScreen({ view: "home" });
    } finally {
      setLogoutBusy(false);
    }
  };

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return (
    <>
      <UpdateNotifier />
      {screen.view === "home" ? (
        <HomePage
          onSelect={(postType) => setScreen({ view: "editor", postType })}
          onLogout={onLogout}
          logoutBusy={logoutBusy}
        />
      ) : screen.postType === "product" ? (
        <MainApp onBack={() => setScreen({ view: "home" })} />
      ) : (
        <AnnouncementEditorApp
          postType={screen.postType}
          onBack={() => setScreen({ view: "home" })}
        />
      )}
    </>
  );
}

export default function App() {
  useEffect(() => {
    void loadFlyonUI().then(() => {
      window.HSStaticMethods?.autoInit();
    });
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate>
          <AppContent />
        </AuthGate>
      </ToastProvider>
    </AuthProvider>
  );
}
