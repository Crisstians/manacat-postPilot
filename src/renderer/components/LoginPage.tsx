import { Alert, Spinner } from "flowbite-react";
import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import logo from "../../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Autentificarea a eșuat.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ffedd5,_#fff7ed_40%,_#fffaf5_75%)] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl shadow-orange-200/50 backdrop-blur">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={logo} alt="Logo Manacat" className="h-20 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">PostPilot</h1>
            <p className="mt-1 text-sm text-slate-600">Autentifică-te pentru a continua</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-orange-200 transition focus:border-orange-300 focus:ring-2"
              placeholder="nume@manacat.ro"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Parolă
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-orange-200 transition focus:border-orange-300 focus:ring-2"
              placeholder="Parola ta"
            />
          </div>

          {error ? <Alert color="failure">{error}</Alert> : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/60 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? (
              <>
                <Spinner size="sm" />
                Se autentifică...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Autentificare
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
