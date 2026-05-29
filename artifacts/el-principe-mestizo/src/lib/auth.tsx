import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  setAuthTokenGetter,
  setOnUnauthorized,
  setRefreshToken,
} from "@workspace/api-client-react/custom-fetch";
import { useLocation } from "wouter";

interface JwtUser {
  userId: number;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: JwtUser | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isVerifying: boolean;
}

function decodeJwt(token: string): JwtUser | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

const REFRESH_ENDPOINT = "/api/auth/refresh";
const ME_ENDPOINT = "/api/auth/me";

async function doRefresh(token: string): Promise<string | null> {
  try {
    const resp = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const [, setLocation] = useLocation();

  // ── Register auth token getter for customFetch ───────────────────────────
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  // ── Register 401 interceptor callbacks ───────────────────────────────────
  useEffect(() => {
    setOnUnauthorized(() => {
      setToken(null);
      setLocation("/admin/login");
    });

    setRefreshToken(async () => {
      // Try refresh using the in-memory token (fallback) or cookie (auto-sent)
      if (token) {
        const newToken = await doRefresh(token);
        if (newToken) {
          setToken(newToken);
          return newToken;
        }
      }
      return null;
    });

    return () => {
      setOnUnauthorized(null);
      setRefreshToken(null);
    };
  }, [token]);

  // ── Verify session on mount ─────────────────────────────────────────────
  // Intenta restaurar sesión desde la cookie HttpOnly (auto-enviada por el browser)
  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const meResp = await fetch(ME_ENDPOINT, {
          credentials: "include",
        });
        if (meResp.ok && !cancelled) {
          const _data = await meResp.json();
          // No tenemos el JWT en JS porque la cookie es HttpOnly,
          // pero _data contiene { userId, email, role } si se necesita
          // El token se mantiene null, custom-fetch usará credentials: include
          setIsVerifying(false);
          return;
        }
      } catch {
        // Sin sesión activa
      }

      if (!cancelled) {
        setIsVerifying(false);
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newToken: string) => {
    // El token se guarda en memoria (React state) para el AuthTokenGetter.
    // La cookie HttpOnly la establece el servidor automáticamente.
    setToken(newToken);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignorar error en logout
    }
    setToken(null);
    setLocation("/admin/login");
  };

  const user = token ? decodeJwt(token) : null;

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, isAuthenticated: !!token, isVerifying }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
