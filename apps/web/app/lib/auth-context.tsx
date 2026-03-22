"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  region: string;
  role: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

function parseJwt(token: string): Record<string, string> | null {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("agripulse_token");
    if (stored) {
      setToken(stored);
      const payload = parseJwt(stored);
      if (payload) {
        setUser({
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          region: payload.region,
          role: payload.role,
        });
      }
    }
  }, []);

  const login = useCallback((newToken: string) => {
    localStorage.setItem("agripulse_token", newToken);
    setToken(newToken);
    const payload = parseJwt(newToken);
    if (payload) {
      setUser({
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        region: payload.region,
        role: payload.role,
      });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("agripulse_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
