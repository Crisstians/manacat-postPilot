import logo from "../../assets/logo.png";
import { LogOut } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

interface AppHeaderProps {
  onBack?: () => void;
  subtitle?: string;
  logoutBusy?: boolean;
  onLogout: () => void | Promise<void>;
}

export function AppHeader({ onBack, subtitle, logoutBusy = false, onLogout }: AppHeaderProps) {
  const { user } = useAuth();
  const userInitials = useMemo(() => {
    const parts = user?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }, [user?.name]);

  return (
    <header className="h-20 border-b border-white/10 bg-gradient-to-r from-black via-zinc-900 to-neutral-800 shadow-lg shadow-black/30">
      <div className="flex h-full items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="btn btn-sm border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              ← Înapoi
            </button>
          ) : null}
          <img src={logo} alt="Logo Manacat" className="h-12 w-auto shrink-0 object-contain" />
          <div className="min-w-0">
            <h1 className="truncate font-sans text-2xl font-bold leading-none text-white">PostPilot</h1>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-white/60">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-content">
                {userInitials}
              </span>
              <span className="max-w-[140px] truncate text-sm text-white/90">{user.name}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={logoutBusy}
            className="btn btn-sm glass border-white/20 text-white hover:bg-white/20"
          >
            {logoutBusy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <LogOut size={16} />
            )}
            Deconectare
          </button>
        </div>
      </div>
    </header>
  );
}
