import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useLogin();
  const { login: setToken, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    return <Redirect to="/admin/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const resp = await login.mutateAsync({ data: { email, password } });
      if (resp.token) {
        setToken(resp.token);
        setLocation("/admin/dashboard");
      }
    } catch {
      setError("Credenciales incorrectas. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_15%_10%)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-bold text-white mb-1">El Príncipe Mestizo</div>
          <div className="font-sans-ui text-sm text-[hsl(35_15%_55%)]">Panel de administración</div>
        </div>

        <div className="bg-[hsl(210_15%_14%)] border border-[hsl(210_12%_20%)] rounded-xl p-8 shadow-xl">
          <h1 className="font-display text-xl font-semibold text-white mb-6">Iniciar sesión</h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[hsl(355_72%_20%)] border border-[hsl(355_72%_35%)] text-sm font-sans-ui text-[hsl(355_72%_75%)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-sans-ui font-medium text-[hsl(35_15%_65%)] uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-sans-ui bg-[hsl(210_15%_18%)] border border-[hsl(210_12%_25%)] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(355_72%_55%)] placeholder:text-[hsl(210_10%_40%)]"
                placeholder="user1@epm.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-sans-ui font-medium text-[hsl(35_15%_65%)] uppercase tracking-wide mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-sans-ui bg-[hsl(210_15%_18%)] border border-[hsl(210_12%_25%)] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(355_72%_55%)] placeholder:text-[hsl(210_10%_40%)]"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3 bg-[hsl(355_72%_38%)] hover:bg-[hsl(355_72%_45%)] text-white font-sans-ui font-medium text-sm rounded-md transition-colors disabled:opacity-60"
            >
              {login.isPending ? "Accediendo..." : "Acceder"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
