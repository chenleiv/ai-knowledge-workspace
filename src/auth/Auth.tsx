// src/auth/Auth.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import {
  setToken as setSessionToken,
  clearToken as clearSessionToken,
  getToken,
} from "../api/auth";

export type Role = "admin" | "viewer";
export type AuthUser = { email: string; role: Role };

type AuthState = { token: string | null; user: AuthUser | null };

type AuthContextValue = AuthState & {
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AUTH_USER_KEY = "authUser";
const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuth(): AuthState {
  const token = getToken(); // <-- from sessionStorage auth_token
  const userRaw = localStorage.getItem(AUTH_USER_KEY);
  const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
  return { token, user };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => loadAuth(), []);
  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<AuthUser | null>(initial.user);

  const value: AuthContextValue = {
    token,
    user,
    login: (nextToken, nextUser) => {
      console.log("SAVING TOKEN:", nextToken);

      setToken(nextToken);
      setUser(nextUser);

      setSessionToken(nextToken); // ✅ sessionStorage auth_token
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser)); // user אפשר להשאיר בלוקאל
    },
    logout: () => {
      setToken(null);
      setUser(null);

      clearSessionToken(); // ✅ removes auth_token
      localStorage.removeItem(AUTH_USER_KEY);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
