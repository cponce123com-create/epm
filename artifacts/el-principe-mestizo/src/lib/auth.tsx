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
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("epm_token");
  });
  const [isVerifying, setIsVerifying] = useState(() => !!localStorage.getItem("epm_token"));

  const [, setLocation] = useLocation();

  // ── Register auth token getter for customFetch ───────────────────────────
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  // ── Register 401 interceptor callbacks ───────────────────────────────────
  useEffect(() => {
    setOnUnauthorized(() => {
      localStorage.removeItem("epm_token");
      setToken(null);
      setLocation("/admin/login");
    });

    setRefreshToken(async () => {
      const currentToken = localStorage.getItem("epm_token");
      if (!currentToken) return null;
      const newToken = await doRefresh(currentToken);
      if (newToken) {
        localStorage.setItem("epm_token", newToken);
        setToken(newToken);
        return newToken;
      }
      return null;
    });

    return () => {
      setOnUnauthorized(null);
      setRefreshToken(null);
    };
  }, []);

  // ── Verify token on mount ───────────────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem("epm_token");
    if (!storedToken) {
      setIsVerifying(false);
      return;
    }

    let cancelled = false;

    async function verify() {
      // 1. Try GET /auth/me (fast path — token still valid)
      try {
        const meResp = await fetch(ME_ENDPOINT, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (meResp.ok && !cancelled) {
          setIsVerifying(false);
          return;
        }
      } catch {
        // Network error — continue to try refresh
      }

      // 2. If expired or failed, try refresh
      const newToken = await doRefresh(storedToken);
      if (cancelled) return;

      if (newToken) {
        localStorage.setItem("epm_token", newToken);
        setToken(newToken);
      } else {
        // Refresh failed — session truly expired
        localStorage.removeItem("epm_token");
        setToken(null);
        setLocation("/admin/login");
      }

      setIsVerifying(false);
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem("epm_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("epm_token");
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
