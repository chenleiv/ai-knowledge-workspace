import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { me, logout as apiLogout } from "../api/authClient";

export type Role = "admin" | "viewer";
export type AuthUser = { email: string; role: Role };

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean; // finished initial /me check
  isAuthed: boolean;
  loginSuccess: (user: AuthUser) => void;
  logout: () => Promise<void>;
};

const AUTH_USER_KEY = "authUser"; // optional: only for UI (NOT secret)

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialUser = useMemo(() => loadUserFromStorage(), []);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // On refresh: validate cookie session via /me
    (async () => {
      try {
        const u = await me();
        setUser(u);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      } catch {
        setUser(null);
        localStorage.removeItem(AUTH_USER_KEY);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  async function doLogout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }

  const value: AuthContextValue = {
    user,
    isReady,
    isAuthed: !!user,
    loginSuccess: (u) => {
      setUser(u);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u)); // optional
    },
    logout: doLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
