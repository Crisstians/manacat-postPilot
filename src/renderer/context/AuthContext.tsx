import { Spinner } from "flowbite-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import logo from "../../assets/logo.png";
import * as authApi from "../../services/authApi";
import { AUTH_STORAGE_KEY, type AuthSession, type AuthUser } from "../../shared/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const readStoredSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

const persistSession = (session: AuthSession | null): void => {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const applySession = useCallback((session: AuthSession | null) => {
    persistSession(session);
    setUser(session?.user ?? null);
    setAccessToken(session?.accessToken ?? null);
    setStatus(session ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const stored = readStoredSession();
      if (!stored?.refreshToken) {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
        return;
      }

      try {
        const session = await authApi.refreshSession(stored.refreshToken);
        if (cancelled) return;
        applySession(session);
      } catch {
        if (cancelled) return;
        applySession(null);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    applySession(session);
  }, [applySession]);

  const logout = useCallback(async () => {
    const stored = readStoredSession();
    if (stored?.refreshToken) {
      try {
        await authApi.logout(stored.refreshToken);
      } catch {
        // Sesiunea locală se șterge oricum.
      }
    }
    applySession(null);
  }, [applySession]);

  const value = useMemo(
    () => ({ status, user, accessToken, login, logout }),
    [status, user, accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth trebuie folosit în interiorul AuthProvider.");
  }
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ffedd5,_#fff7ed_40%,_#fffaf5_75%)]">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/70 bg-white/80 px-10 py-8 shadow-xl shadow-orange-200/50 backdrop-blur">
          <img src={logo} alt="Logo Manacat" className="h-16 w-auto object-contain" />
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Spinner size="sm" color="warning" />
            Se verifică sesiunea...
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
