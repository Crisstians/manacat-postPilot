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
    <main className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="card card-border w-full max-w-md bg-base-100 p-8 shadow-sm shadow-base-content/5">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={logo} alt="Logo Manacat" className="h-20 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-base-content">PostPilot</h1>
            <p className="mt-1 text-sm text-base-content/70">Autentifică-te pentru a continua</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div>
            <label htmlFor="email" className="label-text mb-1.5 block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input input-sm w-full"
              placeholder="nume@manacat.ro"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-text mb-1.5 block text-sm font-semibold">
              Parolă
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input input-sm w-full"
              placeholder="Parola ta"
            />
          </div>

          {error ? (
            <div className="alert alert-soft alert-error py-2 text-sm" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary btn-sm btn-block"
          >
            {busy ? (
              <>
                <span className="loading loading-spinner loading-xs" />
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
