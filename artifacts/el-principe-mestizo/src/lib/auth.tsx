import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("epm_token");
  });

  const [, setLocation] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

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
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
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
