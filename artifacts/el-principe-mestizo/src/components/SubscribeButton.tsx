import { useState } from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Botón Suscríbete — Google Identity Services + email fallback.
 * Muestra un botón que inicia el flujo de suscripción gratuita.
 */
export default function SubscribeButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");

  const subscribeWithGoogle = async () => {
    setStatus("loading");
    setMessage("");
    try {
      // Google Identity Services — One Tap
      const token = await getGoogleIdToken();
      if (!token) {
        setShowEmailInput(true);
        setStatus("idle");
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/subscribe/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "¡Suscrito!");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Error al suscribir");
      }
    } catch {
      setShowEmailInput(true);
      setStatus("idle");
    }
  };

  const subscribeWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");
    setMessage("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/subscribe/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "¡Suscrito!");
        setShowEmailInput(false);
      } else {
        setStatus("error");
        setMessage(data.error ?? "Error al suscribir");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 size={16} className="text-green-600" />
        <span className="text-sm font-sans-ui font-medium text-green-700">{message || "¡Suscrito!"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Botón principal Google */}
      <button
        onClick={subscribeWithGoogle}
        disabled={status === "loading"}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-sans-ui font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        {status === "loading" ? "Conectando…" : "Suscríbete con Google"}
      </button>

      {/* Alternativa email */}
      {!showEmailInput ? (
        <button
          onClick={() => setShowEmailInput(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-sans-ui text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Mail size={13} />
          Suscribirse con email
        </button>
      ) : (
        <form onSubmit={subscribeWithEmail} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="flex-1 px-3 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-sans-ui font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : "Suscribir"}
          </button>
        </form>
      )}

      {status === "error" && message && (
        <p className="text-xs text-red-600 font-sans-ui">{message}</p>
      )}
    </div>
  );
}

/** Obtiene un token de Google Identity Services mediante popup */
function getGoogleIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    // Intentar Google One Tap / popup
    // Si el script de Google GIS ya está cargado, usar la API
    const g = (window as any).google;
    if (g?.accounts?.id) {
      g.accounts.id.initialize({
        client_id: "811769209677-9t8q3m5k2v7k7f1p3a0v6uk7d0ke4t99.apps.googleusercontent.com",
        callback: (response: any) => {
          resolve(response.credential ?? null);
        },
      });
      g.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Si One Tap no se muestra, abrir popup
          resolve(null); // vuelve al email fallback
        }
      });
    } else {
      // Si el script no está, intentar cargarlo y reintentar
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        setTimeout(() => resolve(null), 500); // Esperar y luego usar popup
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    }
  });
}
